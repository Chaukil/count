// File: script.js

// --- Cấu hình Firebase ---
// Dán cấu hình Firebase của bạn từ Firebase Console tại đây
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
// const storage = firebase.storage(); // Bỏ comment nếu bạn muốn sử dụng Firebase Storage

// --- Biến toàn cục ---
let currentRole = null; // 'admin' hoặc 'inventory'
let productsData = []; // Dữ liệu sản phẩm được tải từ Firestore và hiển thị trên bảng
let currentUserId = null; // ID của người dùng Firebase hiện tại đã đăng nhập
let currentExcelHeaders = []; // Mảng chứa các tiêu đề cột từ file Excel đã tải lên cuối cùng

// Email của tài khoản Admin trong Firebase Authentication
// THAY THẾ BẰNG EMAIL ADMIN THỰC TẾ CỦA BẠN ĐÃ TẠO TRONG FIREBASE AUTH
const ADMIN_EMAIL = "chauchikil01@gmail.com"; 

// --- Tham chiếu đến các phần tử DOM ---
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
// const logoutBtn = document.querySelector('.logout-btn'); // Nút logout đã có onclick trong HTML

// Tham chiếu đến collection 'products' và document 'tableHeaders' trong Firestore
const productsCollection = db.collection('products');
const tableStructureDoc = db.collection('settings').doc('tableHeaders');


// --- Hàm khởi tạo khi trang tải (khi DOM đã sẵn sàng) ---
document.addEventListener('DOMContentLoaded', function() {
    roleScreen.classList.remove('hide');
    mainScreen.classList.add('hide');
    loginModal.style.display = 'none'; // Đảm bảo modal đăng nhập bị ẩn ban đầu
    adminControls.classList.remove('show'); // Ẩn admin controls ban đầu
    exportBtn.classList.add('hide'); // Ẩn nút xuất ban đầu
    saveDataBtn.classList.add('hide'); // Ẩn nút lưu ban đầu
});

// --- Chức năng Xác thực Người dùng và Chuyển đổi Màn hình ---

// Theo dõi trạng thái xác thực của người dùng Firebase
auth.onAuthStateChanged(user => {
    if (user) {
        // Người dùng đã đăng nhập
        currentUserId = user.uid;
        // Kiểm tra xem người dùng hiện tại có phải là Admin dựa trên email không
        if (user.email === ADMIN_EMAIL) {
            currentRole = 'admin';
        } else {
            currentRole = 'inventory';
        }
        console.log(`Người dùng đã đăng nhập: ${user.email}, Vai trò: ${currentRole}`);
        showMainScreen(); // Hiển thị màn hình chính
    } else {
        // Người dùng đã đăng xuất hoặc chưa đăng nhập
        console.log("Người dùng đã đăng xuất hoặc chưa đăng nhập.");
        currentUserId = null;
        logoutUI(); // Quay về màn hình chọn vai trò/đăng nhập
    }
});

// Hiển thị Modal Đăng nhập
function showLoginModal(role) {
    currentRole = role; // Đặt vai trò tạm thời cho phiên đăng nhập
    loginModalTitle.textContent = (role === 'admin' ? 'Đăng nhập Admin' : 'Đăng nhập Kiểm kê');
    loginError.textContent = ''; // Xóa thông báo lỗi cũ
    userEmailInput.value = ''; // Xóa email đã nhập
    userPasswordInput.value = ''; // Xóa mật khẩu đã nhập
    loginModal.style.display = 'flex'; // Hiển thị modal
}

// Đóng Modal Đăng nhập
function closeLoginModal() {
    loginModal.style.display = 'none';
}

// Xử lý Đăng nhập
async function handleLogin() {
    const email = userEmailInput.value.trim();
    const password = userPasswordInput.value.trim();
    loginError.textContent = ''; // Xóa lỗi cũ

    if (!email || !password) {
        loginError.textContent = 'Vui lòng nhập đầy đủ email và mật khẩu.';
        return;
    }

    try {
        // Cố gắng đăng nhập người dùng với email và mật khẩu
        await auth.signInWithEmailAndPassword(email, password);
        // Nếu đăng nhập thành công, auth.onAuthStateChanged sẽ tự động xử lý việc chuyển màn hình
        closeLoginModal(); // Đóng modal
    } catch (error) {
        console.error("Lỗi đăng nhập:", error.code, error.message);
        let errorMessage = 'Lỗi đăng nhập. Vui lòng thử lại.';
        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = 'Email hoặc mật khẩu không đúng.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Email không hợp lệ.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Tài khoản này đã bị tạm khóa do quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau.';
                break;
            default:
                errorMessage = 'Có lỗi xảy ra trong quá trình đăng nhập. Mã lỗi: ' + error.code;
        }
        loginError.textContent = errorMessage; // Hiển thị lỗi
    }
}

// Hiển thị màn hình chính dựa trên vai trò
function showMainScreen() {
    roleScreen.classList.add('hide');
    mainScreen.classList.remove('hide');

    // Cập nhật hiển thị UI dựa trên vai trò
    if (currentRole === 'admin') {
        adminControls.classList.add('show'); // Hiển thị các nút điều khiển Admin
        exportBtn.classList.remove('hide'); // Hiện nút Xuất Excel
        screenTitle.textContent = 'Hệ thống Kiểm kê (Admin)';
    } else {
        adminControls.classList.remove('show'); // Ẩn các nút điều khiển Admin
        exportBtn.classList.add('hide'); // Ẩn nút Xuất Excel cho Kiểm kê viên
        screenTitle.textContent = 'Hệ thống Kiểm kê (Kiểm kê viên)';
    }
    saveDataBtn.classList.remove('hide'); // Nút Lưu Dữ Liệu luôn hiển thị cho cả hai vai trò

    // Tải dữ liệu từ Firestore khi vào màn hình chính
    loadDataFromFirestore();
}

// Xử lý Đăng xuất
async function logout() {
    try {
        await auth.signOut();
        // auth.onAuthStateChanged sẽ tự động gọi logoutUI() sau khi đăng xuất
    } catch (error) {
        console.error("Lỗi khi đăng xuất:", error);
        alert("Lỗi khi đăng xuất. Vui lòng thử lại.");
    }
}

// Cập nhật UI khi đăng xuất
function logoutUI() {
    currentRole = null;
    currentUserId = null;
    productsData = []; // Xóa dữ liệu cục bộ
    currentExcelHeaders = []; // Xóa headers cục bộ
    tableContainer.innerHTML = ''; // Xóa bảng HTML
    fileInput.value = ''; // Reset input file

    mainScreen.classList.add('hide'); // Ẩn màn hình chính
    roleScreen.classList.remove('hide'); // Hiển thị màn hình chọn vai trò
    adminControls.classList.remove('show'); // Đảm bảo ẩn admin controls
    exportBtn.classList.add('hide'); // Đảm bảo ẩn nút xuất
    saveDataBtn.classList.add('hide'); // Đảm bảo ẩn nút lưu
}

// --- Xử lý Tải File Excel và Lưu vào Firestore ---

// Kiểm tra định dạng file Excel
function validateFile(input) {
    const file = input.files[0];
    if (file) {
        const fileExtension = file.name.split('.').pop().toLowerCase();
        if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
            alert('Vui lòng chọn file Excel (.xlsx hoặc .xls).');
            input.value = ''; // Xóa file đã chọn
        }
    }
}

// Tải file Excel và lưu vào Firestore
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

    // Xác nhận nếu có dữ liệu hiện có
    if (productsData.length > 0 && !confirm('Tải file mới sẽ xóa TẤT CẢ dữ liệu hiện tại và cấu trúc cột trong cơ sở dữ liệu Firebase. Bạn có muốn tiếp tục?')) {
        fileInput.value = '';
        return;
    }

    const loadButton = document.querySelector('button[onclick="loadExcel()"]');
    loadButton.textContent = 'Đang tải...';
    loadButton.disabled = true;

    try {
        // Đọc file Excel dưới dạng ArrayBuffer
        const data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(new Uint8Array(e.target.result));
            reader.onerror = (e) => reject(e);
            reader.readAsArrayBuffer(file);
        });

        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        // Đọc header riêng biệt từ hàng đầu tiên
        // sheet_to_json với {header: 1} trả về mảng các mảng
        const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }); 
        const excelHeaders = rawData[0]; // Hàng đầu tiên là headers
        
        // Đọc dữ liệu từ hàng thứ 2 trở đi dưới dạng JSON objects
        const dataRows = XLSX.utils.sheet_to_json(firstSheet); 

        if (!dataRows || dataRows.length === 0) {
            alert('File Excel không có dữ liệu hoặc không đúng định dạng. Vui lòng kiểm tra file.');
            return;
        }

        // --- LƯU CẤU TRÚC HEADERS VÀO FIRESTORE ---
        await tableStructureDoc.set({
            headers: excelHeaders, // Lưu mảng tên các cột gốc từ Excel
            uploaded_at: firebase.firestore.FieldValue.serverTimestamp(),
            uploaded_by: currentUserId
        });
        console.log("Đã lưu cấu trúc headers vào Firestore:", excelHeaders);

        // Xóa dữ liệu sản phẩm cũ khỏi Firestore
        await clearFirestoreData(false); // Gọi hàm xóa nhưng không hỏi xác nhận lại

        // --- Thêm dữ liệu sản phẩm mới vào Firestore theo từng hàng (sử dụng Batch) ---
        console.log("Đang thêm dữ liệu mới vào Firestore...");
        const batch = db.batch();
        dataRows.forEach((row, index) => {
            const docRef = productsCollection.doc(); // Firestore sẽ tự tạo ID document
            batch.set(docRef, {
                ...row, // Sao chép tất cả các trường từ Excel
                // Đảm bảo so_luong_thuc_te là số và mặc định là 0 nếu không có hoặc không hợp lệ
                so_luong_thuc_te: row.hasOwnProperty('so_luong_thuc_te') ? parseFloat(row.so_luong_thuc_te) || 0 : 0, 
                created_at: firebase.firestore.FieldValue.serverTimestamp(), // Dấu thời gian tạo
                updated_at: firebase.firestore.FieldValue.serverTimestamp(), // Dấu thời gian cập nhật
                uploaded_by: currentUserId // ID người dùng đã tải lên
            });
        });
        await batch.commit(); // Gửi batch lên Firestore

        alert('Đã tải dữ liệu từ Excel và lưu vào Firestore thành công!');
        // Sau khi lưu, tải lại dữ liệu và cấu trúc header để cập nhật giao diện
        loadDataFromFirestore();

    } catch (error) {
        console.error('LỖI KHI XỬ LÝ FILE EXCEL HOẶC LƯU VÀO FIRESTORE:', error);
        alert('Lỗi khi tải file Excel hoặc lưu vào Firestore: ' + error.message);
    } finally {
        loadButton.textContent = 'Tải Excel';
        loadButton.disabled = false;
        fileInput.value = ''; // Xóa file đã chọn trong input
    }
}

// Tải dữ liệu sản phẩm và cấu trúc headers từ Firestore
async function loadDataFromFirestore() {
    try {
        console.log("Bước 1: Đang cố gắng tải cấu trúc headers từ Firestore...");
        const headersSnapshot = await tableStructureDoc.get();
        if (headersSnapshot.exists) {
            currentExcelHeaders = headersSnapshot.data().headers || [];
            console.log("Bước 2: Đã tải cấu trúc headers:", currentExcelHeaders);
        } else {
            console.warn("Không tìm thấy cấu trúc headers trong Firestore. Vui lòng tải một file Excel.");
            currentExcelHeaders = []; // Đảm bảo mảng rỗng nếu không có headers
        }

        console.log("Bước 3: Đang tải dữ liệu sản phẩm từ Firestore...");
        // Lấy tất cả documents từ collection 'products'
        const snapshot = await productsCollection.get(); 

        console.log("Bước 4: Snapshot dữ liệu sản phẩm đã nhận được. Số lượng tài liệu:", snapshot.docs.length);

        if (snapshot.empty) {
            console.log("Bước 5: Collection 'products' rỗng hoặc không có tài liệu nào.");
            productsData = []; // Đảm bảo mảng rỗng
            renderTable(); // Vẫn gọi renderTable để hiển thị thông báo "Chưa có dữ liệu"
            return;
        }

        // Chuyển đổi snapshot thành mảng productsData
        productsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id, // Lưu lại ID của document để cập nhật sau này
                ...data     // Sao chép toàn bộ dữ liệu của document
            };
        });

        console.log("Bước 6: Dữ liệu sản phẩm đã tải vào productsData:", productsData);
        renderTable(); // Gọi hàm renderTable để hiển thị dữ liệu lên bảng
        console.log("Bước 7: Đã gọi renderTable().");

    } catch (error) {
        console.error("LỖI CRITICAL KHI TẢI DỮ LIỆU TỪ FIRESTORE:", error);
        alert("Lỗi khi tải dữ liệu từ cơ sở dữ liệu. Vui lòng kiểm tra Console để biết chi tiết.");
    }
}

// Xóa toàn bộ dữ liệu sản phẩm trong Firestore
async function clearFirestoreData(confirmAction = true) {
    if (currentRole !== 'admin') {
        alert('Bạn không có quyền thực hiện chức năng này!');
        return;
    }

    if (confirmAction && !confirm('Bạn có chắc chắn muốn xóa TẤT CẢ dữ liệu sản phẩm khỏi Firebase? Thao tác này không thể hoàn tác!')) {
        return;
    }

    try {
        const batch = db.batch();
        const snapshot = await productsCollection.get(); // Lấy tất cả documents

        if (snapshot.empty) {
            console.log("Không có dữ liệu để xóa trong Firestore.");
            alert('Không có dữ liệu để xóa!');
            return;
        }

        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref); // Đánh dấu để xóa từng document
        });
        await batch.commit(); // Thực hiện xóa hàng loạt

        productsData = []; // Xóa dữ liệu cục bộ
        renderTable(); // Cập nhật giao diện người dùng
        alert('Đã xóa tất cả dữ liệu khỏi Firebase thành công!');
        console.log("Đã xóa tất cả dữ liệu khỏi Firestore.");

    } catch (error) {
        console.error("LỖI KHI XÓA DỮ LIỆU TỪ FIRESTORE:", error);
        alert("Lỗi khi xóa dữ liệu từ cơ sở dữ liệu: " + error.message);
    }
}

// Hàm gọi từ nút "Xóa Dữ Liệu" trên UI
function clearData() {
    clearFirestoreData(true); // Gọi hàm xóa với xác nhận
}

// Lưu dữ liệu số lượng thực tế đã nhập vào Firestore
async function saveData() {
    if (productsData.length === 0) {
        alert('Chưa có dữ liệu để lưu!');
        return;
    }

    const saveButton = document.querySelector('.save-btn');
    saveButton.textContent = 'Đang lưu...';
    saveButton.disabled = true;

    try {
        const batch = db.batch(); // Sử dụng batch để cập nhật nhiều document cùng lúc
        const inputs = tableContainer.querySelectorAll('input.actual-qty'); // Lấy tất cả các ô input

        for (const input of inputs) {
            const docId = input.dataset.docId; // Lấy ID document từ thuộc tính data-doc-id
            const value = parseFloat(input.value) || 0; // Chuyển giá trị sang số, mặc định là 0 nếu không hợp lệ

            // Kiểm tra xem docId có hợp lệ không
            if (docId) {
                const productRef = productsCollection.doc(docId); // Tạo tham chiếu đến document
                batch.update(productRef, {
                    so_luong_thuc_te: value, // Cập nhật số lượng thực tế
                    updated_at: firebase.firestore.FieldValue.serverTimestamp(), // Cập nhật thời gian
                    updated_by: currentUserId // Cập nhật người sửa
                });
            } else {
                console.warn("Cảnh báo: Không tìm thấy docId cho input:", input);
            }
        }
        await batch.commit(); // Thực hiện cập nhật hàng loạt

        alert('Đã lưu dữ liệu thực tế vào Firestore thành công!');
        // Tải lại dữ liệu để cập nhật trạng thái hiển thị (ví dụ: class 'saved-value')
        loadDataFromFirestore();

    } catch (error) {
        console.error("LỖI KHI LƯU DỮ LIỆU VÀO FIRESTORE:", error);
        alert("Lỗi khi lưu dữ liệu: " + error.message);
    } finally {
        saveButton.textContent = 'Lưu Dữ Liệu';
        saveButton.disabled = false;
    }
}


// --- Hiển thị dữ liệu lên Bảng HTML ---
function renderTable() {
    console.log("Bước A: Đang render bảng. Dữ liệu đầu vào productsData:", productsData);
    console.log("Sử dụng Headers đã tải:", currentExcelHeaders);

    if (!productsData || productsData.length === 0) {
        tableContainer.innerHTML = '<p style="text-align: center; margin-top: 20px;">Chưa có dữ liệu. Vui lòng tải file Excel.</p>';
        return;
    }

    let tableHTML = `
        <table>
            <thead>
                <tr>
    `;

    // Sử dụng currentExcelHeaders để tạo tiêu đề bảng và đảm bảo thứ tự
    if (currentExcelHeaders.length === 0) {
        // Fallback: Nếu không có headers được tải (có thể do chưa tải file excel lần nào),
        // lấy các key từ đối tượng sản phẩm đầu tiên làm headers tạm thời
        console.warn("Không có headers đã lưu, sử dụng các key mặc định từ dữ liệu đầu tiên.");
        const firstProductKeys = Object.keys(productsData[0]).filter(key => 
            key !== 'id' && 
            key !== 'so_luong_thuc_te' && 
            key !== 'created_at' && 
            key !== 'updated_at' && 
            key !== 'uploaded_by'
        );
        currentExcelHeaders = firstProductKeys; // Gán tạm thời để vẫn hiển thị được bảng
    }

    currentExcelHeaders.forEach(header => {
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
        // Hiển thị dữ liệu theo thứ tự headers đã lưu
        currentExcelHeaders.forEach(header => {
            // Đảm bảo truy cập đúng trường từ product data
            const cellContent = String(product[header] !== undefined && product[header] !== null ? product[header] : '');
            tableHTML += `<td>${cellContent}</td>`;
        });

        // Hiển thị ô nhập Số Lượng Thực Tế
        const actualQty = product.so_luong_thuc_te !== undefined && product.so_luong_thuc_te !== null ? product.so_luong_thuc_te : '';
        // Thêm class 'saved-value' nếu có giá trị khác rỗng hoặc khác 0
        const savedClass = (actualQty !== '' && actualQty !== 0 && actualQty !== '0') ? 'saved-value' : ''; 

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

    // Gắn event listener cho các input sau khi chúng được tạo trong DOM
    const inputs = tableContainer.querySelectorAll('input.actual-qty');
    inputs.forEach(input => {
        input.addEventListener('input', (event) => {
            // Khi người dùng nhập, xóa class 'saved-value' ngay lập tức
            event.target.parentElement.classList.remove('saved-value');
        });
    });
    console.log("Bước E: Bảng HTML đã được render và gán vào DOM. Event listeners đã được gắn.");
}

// --- Xuất dữ liệu ra Excel và tải xuống máy ---
function exportToExcel() {
    if (currentRole !== 'admin') {
        alert('Bạn không có quyền xuất dữ liệu ra Excel!');
        return;
    }
    if (productsData.length === 0) {
        alert('Không có dữ liệu để xuất ra Excel!');
        return;
    }
    
    // Đảm bảo có headers để xuất
    if (currentExcelHeaders.length === 0) {
        alert('Không tìm thấy cấu trúc cột để xuất. Vui lòng tải một file Excel trước.');
        return;
    }

    const dataToExport = productsData.map(product => {
        const exportedRow = {};
        // Lặp qua các headers đã lưu để đảm bảo đúng thứ tự và chỉ các cột mong muốn
        currentExcelHeaders.forEach(header => {
            // Gán giá trị của cột đó từ dữ liệu sản phẩm
            exportedRow[header] = product[header] !== undefined && product[header] !== null ? product[header] : '';
        });

        // Luôn thêm cột "Số lượng thực tế" vào cuối cùng của file xuất ra
        exportedRow['Số lượng thực tế'] = product.so_luong_thuc_te !== undefined && product.so_luong_thuc_te !== null ? product.so_luong_thuc_te : '';
        return exportedRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'DuLieuKiemKe');

    const date = new Date();
    // Tạo tên file với định dạng YYYYMMDD_HHmmss
    const dateString = `${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}`;
    const filename = `DuLieuKiemKe_${dateString}.xlsx`;

    // Tải file Excel xuống máy tính người dùng
    XLSX.writeFile(workbook, filename);
    alert('Dữ liệu đã được xuất ra file Excel và tải về máy: ' + filename);

    // --- Tùy chọn: Lưu file này lên Firebase Storage ---
    /*
    // Bỏ comment nếu bạn đã bật Firebase Storage trong dự án Firebase
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    
    // Tạo tham chiếu đến nơi bạn muốn lưu trong Storage (ví dụ: 'exports/filename.xlsx')
    const storageRef = storage.ref().child(`exports/${filename}`);
    
    // Bắt đầu quá trình tải lên
    storageRef.put(blob).then(snapshot => {
        console.log('File đã được tải lên Firebase Storage thành công!', snapshot);
        snapshot.ref.getDownloadURL().then(url => {
            console.log('URL tải xuống:', url);
            // Bạn có thể lưu URL này vào Firestore nếu muốn lưu lại lịch sử xuất file
            // Ví dụ: db.collection('exports_log').add({ filename: filename, url: url, exported_at: firebase.firestore.FieldValue.serverTimestamp(), exported_by: currentUserId });
        });
    }).catch(error => {
        console.error('Lỗi khi tải file lên Firebase Storage:', error);
        alert('Có lỗi khi tải file lên Firebase Storage: ' + error.message);
    });
    */
}