// File: script.js

// --- Cấu hình Firebase ---
// Dán cấu hình Firebase của bạn từ Bước 1 tại đây
const firebaseConfig = {
    apiKey: "AIzaSyDtBANCJsW0Hbt9QYszXwGY05sKWbzkK3I",
    authDomain: "excelinventoryapp.firebaseapp.com",
    projectId: "excelinventoryapp",
    storageBucket: "excelinventoryapp.firebasestorage.app",
    messagingSenderId: "30371962017",
    appId: "1:30371962017:web:e0449e23ec9eb0104b24e0",
    measurementId: "G-9ENEPK7XN7"
  };
  

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
// const storage = firebase.storage(); // Chỉ bật nếu bạn muốn lưu trữ file Excel gốc

// --- Biến toàn cục ---
let currentRole = null; // 'admin' hoặc 'inventory'
let productsData = []; // Dữ liệu sản phẩm hiển thị trên bảng
let currentUserId = null; // ID của người dùng Firebase hiện tại

// --- DOM Elements ---
const roleScreen = document.getElementById('roleScreen');
const loginModal = document.getElementById('loginModal');
const loginModalTitle = document.getElementById('loginModalTitle');
const userEmailInput = document.getElementById('userEmail');
const userPasswordInput = document.getElementById('userPassword');
const loginError = document.getElementById('loginError');
const mainScreen = document.getElementById('mainScreen');
const screenTitle = document.getElementById('screenTitle');
const adminControls = document.getElementById('adminControls');
const fileInput = document.getElementById('fileInput');
const tableContainer = document.getElementById('tableContainer');
const exportBtn = document.getElementById('exportBtn');
const saveDataBtn = document.querySelector('.save-btn');
const logoutBtn = document.querySelector('.logout-btn');

// Tham chiếu đến collection trong Firestore
const productsCollection = db.collection('products');


// --- Chức năng xác thực và chuyển đổi màn hình ---

// Theo dõi trạng thái xác thực
auth.onAuthStateChanged(user => {
    if (user) {
        currentUserId = user.uid;
        // Kiểm tra vai trò của người dùng nếu cần (ví dụ: thông qua Custom Claims hoặc một collection 'users')
        // Hiện tại, chúng ta sẽ dựa vào lựa chọn ban đầu của người dùng hoặc email cụ thể
        showMainScreen();
    } else {
        currentUserId = null;
        logoutUI(); // Quay về màn hình đăng nhập nếu không có người dùng
    }
});

function showLoginModal(role) {
    currentRole = role;
    loginModalTitle.textContent = (role === 'admin' ? 'Đăng nhập Admin' : 'Đăng nhập Kiểm kê');
    loginError.textContent = ''; // Xóa lỗi cũ
    userEmailInput.value = '';
    userPasswordInput.value = '';
    loginModal.style.display = 'flex';
}

function closeLoginModal() {
    loginModal.style.display = 'none';
}

async function handleLogin() {
    const email = userEmailInput.value;
    const password = userPasswordInput.value;
    loginError.textContent = '';

    if (!email || !password) {
        loginError.textContent = 'Vui lòng nhập email và mật khẩu.';
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // auth.onAuthStateChanged sẽ tự động gọi showMainScreen()
        closeLoginModal();
    } catch (error) {
        console.error("Lỗi đăng nhập:", error);
        let errorMessage = 'Lỗi đăng nhập. Vui lòng thử lại.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Email hoặc mật khẩu không đúng.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Email không hợp lệ.';
        }
        loginError.textContent = errorMessage;
    }
}

function showMainScreen() {
    roleScreen.classList.add('hide');
    mainScreen.classList.remove('hide');

    // Xác định quyền Admin dựa trên email hoặc một trường trong Firestore
    // Ví dụ đơn giản: coi một email cụ thể là Admin
    const ADMIN_EMAIL = "admin@example.com"; // THAY THẾ BẰNG EMAIL ADMIN THỰC CỦA BẠN TRONG FIREBASE AUTH
    if (auth.currentUser && auth.currentUser.email === ADMIN_EMAIL) {
        currentRole = 'admin';
    } else {
        currentRole = 'inventory';
    }

    if (currentRole === 'admin') {
        adminControls.classList.add('show');
        exportBtn.classList.remove('hide');
        screenTitle.textContent = 'Hệ thống Kiểm kê (Admin)';
    } else {
        adminControls.classList.remove('show');
        exportBtn.classList.add('hide');
        screenTitle.textContent = 'Hệ thống Kiểm kê (Kiểm kê viên)';
    }
    saveDataBtn.classList.remove('hide'); // Nút lưu luôn hiển thị

    loadDataFromFirestore(); // Tải dữ liệu từ Firestore
}

async function logout() {
    try {
        await auth.signOut();
        // onAuthStateChanged sẽ tự động xử lý logoutUI()
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
        alert("Lỗi khi đăng xuất. Vui lòng thử lại.");
    }
}

function logoutUI() {
    currentRole = null;
    currentUserId = null;
    productsData = []; // Xóa dữ liệu tạm thời
    tableContainer.innerHTML = ''; // Xóa bảng
    fileInput.value = ''; // Reset input file

    mainScreen.classList.add('hide');
    roleScreen.classList.remove('hide');
    adminControls.classList.remove('show');
    exportBtn.classList.add('hide');
    saveDataBtn.classList.add('hide');
}

// --- Xử lý tải file Excel & Lưu vào Firestore ---
function validateFile(input) {
    const file = input.files[0];
    if (file) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
            alert('Vui lòng chọn file Excel (.xlsx hoặc .xls).');
            input.value = '';
        }
    }
}

async function loadExcel() {
    if (currentRole !== 'admin') {
        alert('Bạn không có quyền thực hiện chức năng này!');
        return;
    }

    const file = fileInput.files[0];
    if (!file) {
        alert('Vui lòng chọn file Excel!');
        return;
    }

    if (productsData.length > 0 && !confirm('Tải file mới sẽ xóa tất cả dữ liệu hiện tại trong cơ sở dữ liệu. Bạn có muốn tiếp tục?')) {
        fileInput.value = '';
        return;
    }

    const loadButton = document.querySelector('button[onclick="loadExcel()"]');
    loadButton.textContent = 'Đang tải...';
    loadButton.disabled = true;

    try {
        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(new Uint8Array(e.target.result));
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (!jsonData || jsonData.length === 0) {
            alert('File Excel không có dữ liệu hoặc không đúng định dạng. Vui lòng kiểm tra file.');
            return;
        }

        // Xóa dữ liệu cũ khỏi Firestore trước khi thêm mới
        await clearFirestoreData();

        // Thêm dữ liệu mới vào Firestore theo từng hàng
        const batch = db.batch();
        jsonData.forEach((row, index) => {
            const docRef = productsCollection.doc(); // Firestore sẽ tự tạo ID
            batch.set(docRef, {
                ...row,
                so_luong_thuc_te: 0, // Mặc định số lượng thực tế là 0 khi tải mới
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_by: currentUserId
            });
        });
        await batch.commit();

        alert('Đã tải dữ liệu từ Excel và lưu vào Firestore thành công!');
        // Sau khi lưu, tải lại dữ liệu từ Firestore để hiển thị
        loadDataFromFirestore();

    } catch (error) {
        console.error('Lỗi khi xử lý file Excel hoặc lưu vào Firestore:', error);
        alert('Lỗi khi tải file Excel hoặc lưu vào Firestore: ' + error.message);
    } finally {
        loadButton.textContent = 'Tải Excel';
        loadButton.disabled = false;
        fileInput.value = '';
    }
}

// Hàm tải dữ liệu từ Firestore
async function loadDataFromFirestore() {
    try {
        // Lấy dữ liệu từ Firestore và sắp xếp theo một trường nào đó nếu cần
        const snapshot = await productsCollection.orderBy('Mã SP' || 'ten_san_pham').get();
        productsData = snapshot.docs.map(doc => ({
            id: doc.id, // Lưu lại ID của document để cập nhật
            ...doc.data()
        }));
        renderTable();
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu từ Firestore:", error);
        alert("Lỗi khi tải dữ liệu từ cơ sở dữ liệu. Vui lòng thử lại.");
    }
}

// Hàm xóa toàn bộ dữ liệu sản phẩm trong Firestore
async function clearFirestoreData() {
    if (currentRole !== 'admin') {
        alert('Bạn không có quyền thực hiện chức năng này!');
        return;
    }

    if (!confirm('Bạn có chắc chắn muốn xóa TẤT CẢ dữ liệu sản phẩm khỏi Firebase? Thao tác này không thể hoàn tác!')) {
        return;
    }

    try {
        const batch = db.batch();
        const snapshot = await productsCollection.get();
        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        productsData = []; // Xóa dữ liệu cục bộ
        renderTable(); // Cập nhật UI
        alert('Đã xóa tất cả dữ liệu khỏi Firebase thành công!');
    } catch (error) {
        console.error("Lỗi khi xóa dữ liệu từ Firestore:", error);
        alert("Lỗi khi xóa dữ liệu từ cơ sở dữ liệu: " + error.message);
    }
}

// Hàm xóa dữ liệu hiển thị (chỉ gọi clearFirestoreData())
function clearData() {
    clearFirestoreData();
}

// Hàm lưu dữ liệu đã nhập vào Firestore
async function saveData() {
    if (productsData.length === 0) {
        alert('Chưa có dữ liệu để lưu!');
        return;
    }

    const saveButton = document.querySelector('.save-btn');
    saveButton.textContent = 'Đang lưu...';
    saveButton.disabled = true;

    try {
        const batch = db.batch();
        const inputs = tableContainer.querySelectorAll('input.actual-qty');

        for (const input of inputs) {
            const docId = input.dataset.docId;
            const value = parseFloat(input.value) || 0; // Đảm bảo là số

            const productRef = productsCollection.doc(docId);
            batch.update(productRef, {
                so_luong_thuc_te: value,
                updated_at: firebase.firestore.FieldValue.serverTimestamp(),
                updated_by: currentUserId
            });
        }
        await batch.commit();

        alert('Đã lưu dữ liệu thực tế vào Firestore thành công!');
        // Sau khi lưu, tải lại để đảm bảo trạng thái UI chính xác (ví dụ: class saved-value)
        loadDataFromFirestore();

    } catch (error) {
        console.error("Lỗi khi lưu dữ liệu vào Firestore:", error);
        alert("Lỗi khi lưu dữ liệu: " + error.message);
    } finally {
        saveButton.textContent = 'Lưu Dữ Liệu';
        saveButton.disabled = false;
    }
}


// --- Hiển thị bảng HTML ---
function renderTable() {
    if (productsData.length === 0) {
        tableContainer.innerHTML = '<p style="text-align: center; margin-top: 20px;">Chưa có dữ liệu. Vui lòng tải file Excel.</p>';
        return;
    }

    let tableHTML = `
        <table>
            <thead>
                <tr>
    `;

    // Tạo headers động từ các keys của đối tượng đầu tiên (trừ 'id')
    const headers = Object.keys(productsData[0]).filter(key => key !== 'id' && key !== 'so_luong_thuc_te' && key !== 'created_at' && key !== 'updated_at' && key !== 'updated_by');
    headers.forEach(header => {
        tableHTML += `<th>${header}</th>`;
    });
    tableHTML += `
                    <th>Số Lượng Thực Tế</th>
                </tr>
            </thead>
            <tbody>
    `;

    productsData.forEach((product) => {
        tableHTML += '<tr>';
        headers.forEach(header => {
            const cellContent = String(product[header] !== undefined && product[header] !== null ? product[header] : '');
            tableHTML += `<td>${cellContent}</td>`;
        });

        const actualQty = product.so_luong_thuc_te !== undefined && product.so_luong_thuc_te !== null ? product.so_luong_thuc_te : '';
        // Kiểm tra xem số lượng thực tế có khác 0 hoặc rỗng không để thêm class saved-value
        const savedClass = (actualQty !== '' && actualQty !== 0) ? 'saved-value' : '';

        tableHTML += `<td class="${savedClass}">
                    <input type="number"
                           class="actual-qty"
                           data-doc-id="${product.id}"
                           value="${actualQty}"
                           min="0">
                </td>`;
        tableHTML += '</tr>';
    });

    tableHTML += `
            </tbody>
        </table>
    `;
    tableContainer.innerHTML = tableHTML;

    // Gắn event listener cho các input sau khi chúng được tạo
    const inputs = tableContainer.querySelectorAll('input.actual-qty');
    inputs.forEach(input => {
        input.addEventListener('input', (event) => {
            // Khi người dùng nhập, xóa class saved-value ngay lập tức
            event.target.parentElement.classList.remove('saved-value');
        });
    });
}

// --- Xuất dữ liệu ra Excel và tải xuống máy (tùy chọn: có thể lưu lên Firebase Storage) ---
function exportToExcel() {
    if (currentRole !== 'admin') {
        alert('Bạn không có quyền xuất dữ liệu ra Excel!');
        return;
    }
    if (productsData.length === 0) {
        alert('Không có dữ liệu để xuất ra Excel!');
        return;
    }

    // Chuẩn bị dữ liệu để xuất (kết hợp các trường gốc và số lượng thực tế)
    const dataToExport = productsData.map(product => {
        const exportedRow = {};
        // Lặp qua tất cả các key trừ 'id', 'created_at', 'updated_at', 'updated_by'
        Object.keys(product).forEach(key => {
            if (key !== 'id' && key !== 'created_at' && key !== 'updated_at' && key !== 'updated_by') {
                exportedRow[key] = product[key];
            }
        });
        // Đảm bảo cột 'Số lượng thực tế' được thêm vào nếu nó không phải là một trong các tiêu đề gốc
        if (!Object.prototype.hasOwnProperty.call(exportedRow, 'Số lượng thực tế')) {
             exportedRow['Số lượng thực tế'] = product.so_luong_thuc_te !== undefined && product.so_luong_thuc_te !== null ? product.so_luong_thuc_te : '';
        }
        return exportedRow;
    });


    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DuLieuKiemKe');

    const date = new Date();
    const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
    const filename = `DuLieuKiemKe_${dateString}.xlsx`;

    XLSX.writeFile(workbook, filename);
    alert('Dữ liệu đã được xuất ra file Excel và tải về máy: ' + filename);

    // Nếu bạn muốn lưu file này lên Firebase Storage, bạn sẽ cần thêm code ở đây:
    /*
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const storageRef = storage.ref().child(`exports/${filename}`);
    storageRef.put(blob).then(snapshot => {
        console.log('Uploaded to Firebase Storage!', snapshot);
        snapshot.ref.getDownloadURL().then(url => {
            console.log('Download URL:', url);
            // Có thể lưu URL này vào Firestore nếu muốn
        });
    }).catch(error => {
        console.error('Error uploading to Firebase Storage:', error);
    });
    */
}