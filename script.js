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

// Biến toàn cục để theo dõi cột đang được sắp xếp và chiều sắp xếp
let currentSortColumn = null;
let currentSortDirection = 'asc'; // 'asc' for ascending, 'desc' for descending

// Biến toàn cục mới cho chức năng ẩn/hiện cột
let visibleColumns = []; // Mảng chứa tên các cột hiện đang hiển thị

// Email của tài khoản Admin trong Firebase Authentication
// THAY THẾ BẰNG EMAIL ADMIN THỰC TẾ CỦA BẠN ĐÃ TẠO TRONG FIREBASE AUTH
const ADMIN_EMAIL = "chauchikil01@gmail.com";

// --- Tham chiếu đến các phần tử DOM ---
// Đảm bảo rằng tất cả các tham chiếu DOM này được khai báo ở đây
// và chỉ truy cập các phần tử sau khi DOM đã được tải đầy đủ.
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
const clearDataBtn = document.querySelector('button[onclick="clearData()"]'); // Tham chiếu cho nút "Xóa Dữ Liệu"

const columnVisibilityModal = document.getElementById('columnVisibilityModal');
const columnCheckboxesContainer = document.getElementById('columnCheckboxes');

const userAvatar = document.getElementById('userAvatar');
const userRoleDisplay = document.getElementById('userRoleDisplay');
const userDropdown = document.getElementById('userDropdown');
const changePasswordModal = document.getElementById('changePasswordModal');
const currentPasswordInput = document.getElementById('currentPassword');
const newPasswordInput = document.getElementById('newPassword');
const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
const changePasswordError = document.getElementById('changePasswordError');
const showColumnVisibilityBtn = document.getElementById('showColumnVisibilityBtn');
const commonControls = document.getElementById('commonControls'); // Tham chiếu đến div chứa nút Ẩn/Hiện Cột


// Tham chiếu đến collection 'products' và document 'tableHeaders' trong Firestore
const productsCollection = db.collection('products');
const tableStructureDoc = db.collection('settings').doc('tableHeaders');


// --- Hàm khởi tạo khi trang tải (khi DOM đã sẵn sàng) ---
// Gói toàn bộ code cần truy cập DOM vào sự kiện DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    roleScreen.classList.remove('hide');
    mainScreen.classList.add('hide');
    loginModal.style.display = 'none'; // Đảm bảo modal đăng nhập bị ẩn ban đầu
    adminControls.classList.remove('show'); // Ẩn admin controls ban đầu

    // Ẩn tất cả các nút khi khởi tạo
    exportBtn.classList.add('hide');
    saveDataBtn.classList.add('hide');
    clearDataBtn.classList.add('hide');
    if (showColumnVisibilityBtn) { // Đảm bảo phần tử tồn tại trước khi thao tác
        showColumnVisibilityBtn.classList.add('hide');
    }
    columnVisibilityModal.style.display = 'none'; // Đảm bảo modal ẩn cột bị ẩn ban đầu
    changePasswordModal.style.display = 'none'; // Đảm bảo modal đổi mật khẩu bị ẩn ban đầu

    // Gắn sự kiện onclick cho avatar sau khi DOM đã sẵn sàng
    if (userAvatar) {
        userAvatar.onclick = toggleUserDropdown;
    } else {
        console.error("Lỗi: Không tìm thấy phần tử userAvatar trong DOM.");
    }

    // Đóng dropdown khi click bên ngoài
    document.addEventListener('click', function(event) {
        if (userAvatar && userDropdown) { // Đảm bảo các phần tử đã được load
            // Nếu click không nằm trong avatar và không nằm trong dropdown, và dropdown đang hiển thị
            if (!userAvatar.contains(event.target) && !userDropdown.contains(event.target) && userDropdown.classList.contains('show')) {
                userDropdown.classList.remove('show');
            }
        }
    });

    // Thêm event listener cho các nút trong modal Đổi mật khẩu
    document.getElementById('changePasswordModal').querySelector('button[onclick="changePassword()"]').addEventListener('click', changePassword);
    document.getElementById('changePasswordModal').querySelector('button[onclick="closeChangePasswordModal()"]').addEventListener('click', closeChangePasswordModal);

    // Thêm event listener cho các nút trong modal Đăng nhập
    document.getElementById('loginModal').querySelector('button[onclick="handleLogin()"]').addEventListener('click', handleLogin);
    document.getElementById('loginModal').querySelector('button[onclick="closeLoginModal()"]').addEventListener('click', closeLoginModal);

    // Thêm event listener cho các nút trong modal Ẩn/Hiện Cột
    document.getElementById('columnVisibilityModal').querySelector('button[onclick="applyColumnVisibility()"]').addEventListener('click', applyColumnVisibility);
    document.getElementById('columnVisibilityModal').querySelector('button[onclick="closeColumnVisibilityModal()"]').addEventListener('click', closeColumnVisibilityModal);

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
    loginModalTitle.textContent = (role === 'admin' ? 'Đăng nhập Admin' : 'Đăng nhập Kiểm kê viên');
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

    // Cập nhật hiển thị UI dựa trên vai trò và user info
    if (currentRole === 'admin') {
        adminControls.classList.add('show'); // Hiển thị các nút điều khiển Admin
        screenTitle.textContent = '';
        userRoleDisplay.textContent = 'Admin'; // Hiển thị vai trò Admin
    } else {
        adminControls.classList.remove('show'); // Ẩn các nút điều khiển Admin
        screenTitle.textContent = '';
        userRoleDisplay.textContent = 'Kiểm kê viên'; // Hiển thị vai trò Kiểm kê viên
    }

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
    visibleColumns = []; // Xóa các cột hiển thị khi đăng xuất

    mainScreen.classList.add('hide'); // Ẩn màn hình chính
    roleScreen.classList.remove('hide'); // Hiển thị màn hình chọn vai trò
    adminControls.classList.remove('show'); // Đảm bảo ẩn admin controls

    // Ẩn tất cả các nút khi đăng xuất
    exportBtn.classList.add('hide');
    saveDataBtn.classList.add('hide');
    clearDataBtn.classList.add('hide');
    columnVisibilityModal.style.display = 'none'; // Đảm bảo modal ẩn cột bị ẩn
    userDropdown.classList.remove('show'); // Ẩn dropdown user khi đăng xuất
    closeChangePasswordModal(); // Đảm bảo đóng modal đổi mật khẩu
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
    if (productsData.length > 0 && !confirm('Tải file mới sẽ xóa TẤT CẢ dữ liệu hiện tại và cấu trúc cột trong bảng. Bạn có muốn tiếp tục?')) {
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
        const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        const excelHeaders = rawData[0];

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
        dataRows.forEach((row) => {
            const docRef = productsCollection.doc(); // Firestore sẽ tự tạo ID document
            batch.set(docRef, {
                ...row, // Sao chép tất cả các trường từ Excel
                // Đảm bảo so_luong_thuc_te là số và mặc định là 0 nếu không có hoặc không hợp lệ
                so_luong_thuc_te: parseFloat(row.so_luong_thuc_te) || 0, // Xử lý an toàn hơn
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

            // Khởi tạo visibleColumns nếu đây là lần đầu hoặc sau khi tải file mới
            // HOẶC nếu người dùng đã có cài đặt lưu trữ (ví dụ: Local Storage)
            // Hiện tại chúng ta sẽ reset lại khi tải dữ liệu mới hoặc lần đầu load
            if (visibleColumns.length === 0 || productsData.length === 0) {
                 // Mặc định tất cả các cột Excel và 'Số Lượng Thực Tế' đều hiển thị
                const allPossibleColumns = [...currentExcelHeaders];
                if (!allPossibleColumns.includes('Số Lượng Thực Tế')) {
                    allPossibleColumns.push('Số Lượng Thực Tế');
                }
                visibleColumns = allPossibleColumns;
            }
        } else {
            console.warn("Không tìm thấy cấu trúc headers trong Firestore. Vui lòng tải một file Excel.");
            currentExcelHeaders = []; // Đảm bảo mảng rỗng nếu không có headers
            visibleColumns = []; // Không có headers thì không có cột nào hiển thị
        }

        console.log("Bước 3: Đang tải dữ liệu sản phẩm từ Firestore...");
        const snapshot = await productsCollection.get();

        console.log("Bước 4: Snapshot dữ liệu sản phẩm đã nhận được. Số lượng tài liệu:", snapshot.docs.length);

        if (snapshot.empty) {
            console.log("Bước 5: Collection 'products' rỗng hoặc không có tài liệu nào.");
            productsData = []; // Đảm bảo mảng rỗng
            renderTable(); // Vẫn gọi renderTable để hiển thị thông báo "Chưa có dữ liệu"
            // Ẩn các nút nếu không có dữ liệu
            exportBtn.classList.add('hide');
            saveDataBtn.classList.add('hide');
            clearDataBtn.classList.add('hide');
            if (showColumnVisibilityBtn) { // ẨN NÚT HIỂN THỊ/ẨN CỘT KHI KHÔNG CÓ DỮ LIỆU
                showColumnVisibilityBtn.classList.add('hide');
            }
            return;
        }

        productsData = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data
            };
        });

        console.log("Bước 6: Dữ liệu sản phẩm đã tải vào productsData:", productsData);
        renderTable(); // Gọi hàm renderTable để hiển thị dữ liệu lên bảng
        console.log("Bước 7: Đã gọi renderTable().");

        // Sau khi tải dữ liệu thành công và có dữ liệu, hiển thị các nút
        saveDataBtn.classList.remove('hide'); // Nút Lưu Dữ Liệu luôn hiển thị khi có dữ liệu
        if (currentRole === 'admin') {
            clearDataBtn.classList.remove('hide');
        } else {
            clearDataBtn.classList.add('hide');
        }

        // Nút Xuất Excel chỉ hiển thị cho Admin
        if (currentRole === 'admin') {
            exportBtn.classList.remove('hide');
        } else {
            exportBtn.classList.add('hide'); // Đảm bảo ẩn nếu không phải admin
        }

        // Nút "Ẩn/Hiện Cột" (và khối commonControls chứa nó) LUÔN HIỂN THỊ KHI CÓ DỮ LIỆU
        if (commonControls) {
            commonControls.classList.remove('hide');
        }

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

    if (confirmAction && !confirm('Bạn có chắc chắn muốn xóa TẤT CẢ dữ liệu sản phẩm khỏi bảng? Thao tác này không thể hoàn tác!')) {
        return;
    }

    try {
        const batch = db.batch();
        const snapshot = await productsCollection.get();

        if (snapshot.empty) {
            console.log("Không có dữ liệu để xóa.");
            //alert('Không có dữ liệu để xóa!');
            return;
        }

        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        productsData = []; // Xóa dữ liệu cục bộ
        renderTable(); // Cập nhật giao diện người dùng

        // Ẩn các nút sau khi xóa dữ liệu
        exportBtn.classList.add('hide');
        saveDataBtn.classList.add('hide');
        clearDataBtn.classList.add('hide');
        if (commonControls) {
            commonControls.classList.add('hide'); // Ẩn khối chứa nút "Ẩn/Hiện Cột"
        }

        alert('Đã xóa tất cả dữ liệu khỏi bảng thành công!');
        console.log("Đã xóa tất cả dữ liệu khỏi Firestore.");

    } catch (error) {
        console.error("LỖI KHI XÓA DỮ LIỆU TỪ FIRESTORE:", error);
        alert("Lỗi khi xóa dữ liệu từ cơ sở dữ liệu: " + error.message);
    }
}

// Hàm gọi từ nút "Xóa Dữ Liệu" trên UI
function clearData() {
    clearFirestoreData(true);
}

// Lưu dữ liệu số lượng thực tế đã nhập vào Firestore
async function saveData() {
    console.log("Đang thực hiện lưu dữ liệu..."); // Log 1: Kiểm tra hàm có được gọi không
    const batch = db.batch();
    let changesMade = false;
    let docsToUpdateCount = 0; 

    // Lấy tất cả các hàng trong bảng
    const rows = document.querySelectorAll('#tableContainer tbody tr');
    console.log("Tìm thấy số hàng:", rows.length); // Log 2: Kiểm tra số hàng

    if (rows.length === 0) {
        alert("Không có dữ liệu trong bảng để lưu.");
        return;
    }

    rows.forEach(row => {
        const id = row.dataset.id;
        const originalData = productsData.find(item => item.id === id);

        if (!originalData) {
            console.warn(`Không tìm thấy dữ liệu gốc cho ID: ${id}. Bỏ qua hàng này.`);
            return;
        }

        const inputs = row.querySelectorAll('input[type="number"]');
        let updateData = {};

        inputs.forEach(input => {
            const header = input.dataset.header;
            const newInputValue = input.value.trim();
            const newValue = newInputValue === '' ? null : Number(newInputValue);
            const originalValue = originalData[header] === undefined ? null : Number(originalData[header]);

            console.log(`Kiểm tra ô [${id}][${header}]: Gốc=${originalValue}, Mới=${newValue}`); // Log 3: Kiểm tra từng ô

            if (newValue !== originalValue) {
                changesMade = true;
                updateData[header] = newValue;
                input.classList.add('saved-value');
            } else if (newValue === 0 && originalValue !== 0) {
                 changesMade = true;
                 updateData[header] = newValue;
                 input.classList.add('saved-value');
            } else if (newValue !== null && originalValue === null) {
                changesMade = true;
                updateData[header] = newValue;
                input.classList.add('saved-value');
            } else if (newValue === null && originalValue !== null) {
                 changesMade = true;
                 updateData[header] = newValue;
                 input.classList.remove('saved-value');
            }
        });

        if (Object.keys(updateData).length > 0) { // <--- Rất quan trọng! updateData phải có key ở đây
            console.log(`[${id}] Có thay đổi. Dữ liệu cập nhật:`, updateData); // Kiểm tra log này
            const docRef = productsCollection.doc(id);
            console.log(`Đang cố gắng cập nhật đường dẫn: ${docRef.path}`);
            batch.update(docRef, updateData);
            docsToUpdateCount++;
            changesMade = true;
        } else {
            console.log(`[${id}] Không có thay đổi đáng kể cho hàng này.`); // Nếu bạn thấy log này, tức là updateData trống
        }
    });

    console.log("Tổng số thay đổi được phát hiện:", changesMade); // Log 5: Tổng thay đổi
    if (!changesMade) {
        alert("Không có thay đổi nào để lưu.");
        return;
    }

    try {
        console.log("Đang cố gắng commit batch..."); // Log 6: Trước khi commit
        await batch.commit();
        alert("Dữ liệu đã được lưu thành công!");
        console.log("Batch write thành công!"); // Log 7: Sau khi commit

        await loadDataFromFirestore();
        console.log("Đã tải lại dữ liệu từ Firestore."); // Log 8: Sau khi tải lại

    } catch (error) {
        console.error("Lỗi khi thực hiện batch write:", error); // Log 9: Lỗi Firebase
        alert("Lỗi khi lưu dữ liệu. Vui lòng kiểm tra Console để biết chi tiết.");
    }
}


// --- Hiển thị dữ liệu lên Bảng HTML và Sắp xếp ---
function renderTable() {
    console.log("Bước A: Đang render bảng. Dữ liệu đầu vào productsData:", productsData);
    console.log("Sử dụng Headers đã tải:", currentExcelHeaders);
    console.log("Các cột hiển thị (visibleColumns):", visibleColumns);

    if (!productsData || productsData.length === 0) {
        tableContainer.innerHTML = '<p style="text-align: center; margin-top: 20px;">Chưa có dữ liệu. Vui lòng tải file Excel.</p>';
        return;
    }

    let tableHTML = `
        <table>
            <thead>
                <tr>
    `;

    // Nếu chưa có headers nào được tải từ Firestore, cố gắng tạo từ dữ liệu đầu tiên
    if (currentExcelHeaders.length === 0) {
        console.warn("Không có headers đã lưu, cố gắng suy ra từ dữ liệu đầu tiên. Vui lòng tải một file Excel để có cấu trúc cột chuẩn.");
        if (productsData.length > 0) {
            // Lọc các key không phải là cột dữ liệu gốc (id, timestamps, so_luong_thuc_te)
            const firstProductKeys = Object.keys(productsData[0]).filter(key =>
                key !== 'id' &&
                key !== 'so_luong_thuc_te' &&
                key !== 'created_at' &&
                key !== 'updated_at' &&
                key !== 'uploaded_by'
            );
            currentExcelHeaders = firstProductKeys;
            // Nếu đây là lần đầu tiên xác định headers, thì mặc định tất cả đều hiển thị
            if (visibleColumns.length === 0) {
                const allPossibleColumns = [...currentExcelHeaders];
                if (!allPossibleColumns.includes('Số Lượng Thực Tế')) {
                    allPossibleColumns.push('Số Lượng Thực Tế');
                }
                visibleColumns = allPossibleColumns;
            }
        }
    }


    // Lặp qua các headers đã tải lên, chỉ hiển thị nếu cột đó nằm trong visibleColumns
    currentExcelHeaders.forEach(header => {
        if (visibleColumns.includes(header)) {
            tableHTML += `<th class="sortable-header" data-column-name="${header}">
                                ${header}
                                <span class="sort-icon"></span>
                              </th>`;
        }
    });

    // Luôn hiển thị cột 'Số Lượng Thực Tế' nếu nó được chọn để hiển thị
    if (visibleColumns.includes('Số Lượng Thực Tế')) {
        tableHTML += `<th class="sortable-header" data-column-name="so_luong_thuc_te">
                            Số Lượng Thực Tế
                            <span class="sort-icon"></span>
                        </th>`;
    }

    tableHTML += `
                    </tr>
            </thead>
            <tbody>
    `;

    productsData.forEach((product) => {
        tableHTML += `<tr data-id="${product.id}">`;
        // Hiển thị dữ liệu theo thứ tự headers đã lưu, chỉ hiển thị nếu cột đó nằm trong visibleColumns
        currentExcelHeaders.forEach(header => {
            if (visibleColumns.includes(header)) {
                const cellContent = String(product[header] !== undefined && product[header] !== null ? product[header] : '');
                tableHTML += `<td>${cellContent}</td>`;
            }
        });

        // Hiển thị ô nhập Số Lượng Thực Tế nếu cột đó hiển thị
        if (visibleColumns.includes('Số Lượng Thực Tế')) {
            const actualQty = (product.so_luong_thuc_te === 0 || product.so_luong_thuc_te === undefined || product.so_luong_thuc_te === null) ? '' : product.so_luong_thuc_te;
            const savedClass = (actualQty !== '' && actualQty !== 0) ? 'saved-value' : ''; // Giữ logic tô màu này
        
            tableHTML += `<td class="${savedClass}">
                                     <input type="number"
                                             class="actual-qty"
                                             data-doc-id="${product.id}"
                                             data-header="so_luong_thuc_te"  // <-- THÊM DÒNG NÀY!
                                             value="${actualQty}"
                                             min="0">
                                     </td>`;
        }
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

    // --- Gắn sự kiện click cho các tiêu đề cột để sắp xếp ---
    const sortableHeaders = tableContainer.querySelectorAll('.sortable-header');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const columnName = header.dataset.columnName;
            sortTable(columnName);
        });
    });

    // Cập nhật biểu tượng sắp xếp sau khi render
    updateSortIcons();
}

// Hàm sắp xếp dữ liệu
function sortTable(columnName) {
    // Nếu nhấp vào cùng một cột, đảo chiều sắp xếp
    if (currentSortColumn === columnName) {
        currentSortDirection = (currentSortDirection === 'asc') ? 'desc' : 'asc';
    } else {
        // Nếu nhấp vào cột khác, đặt lại cột và sắp xếp tăng dần
        currentSortColumn = columnName;
        currentSortDirection = 'asc';
    }

    productsData.sort((a, b) => {
        let valA = a[columnName];
        let valB = b[columnName];

        // Xử lý giá trị undefined/null bằng cách coi chúng là chuỗi rỗng để so sánh
        // hoặc số 0 nếu là cột số lượng thực tế
        if (columnName === 'so_luong_thuc_te') {
            valA = parseFloat(valA) || 0;
            valB = parseFloat(valB) || 0;
            if (valA < valB) {
                return currentSortDirection === 'asc' ? -1 : 1;
            }
            if (valA > valB) {
                return currentSortDirection === 'asc' ? 1 : -1;
            }
        } else {
            // So sánh chuỗi cho các cột khác
            valA = String(valA || '').toLowerCase();
            valB = String(valB || '').toLowerCase();
            if (valA < valB) {
                return currentSortDirection === 'asc' ? -1 : 1;
            }
            if (valA > valB) {
                return currentSortDirection === 'asc' ? 1 : -1;
            }
        }
        return 0;
    });

    renderTable(); // Render lại bảng với dữ liệu đã sắp xếp
}

// Hàm cập nhật biểu tượng sắp xếp trên tiêu đề bảng
function updateSortIcons() {
    const sortableHeaders = tableContainer.querySelectorAll('.sortable-header');
    sortableHeaders.forEach(header => {
        const sortIcon = header.querySelector('.sort-icon');
        const columnName = header.dataset.columnName;

        // Xóa tất cả các class sắp xếp cũ
        if (sortIcon) { // Đảm bảo sortIcon tồn tại
            sortIcon.classList.remove('asc', 'desc');

            // Nếu đây là cột đang được sắp xếp, thêm class phù hợp
            if (columnName === currentSortColumn) {
                sortIcon.classList.add(currentSortDirection);
            }
        }
    });
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


// --- Chức năng ẩn/hiện cột ---

// Hiển thị modal ẩn/hiện cột
function showColumnVisibilityModal() {
    // Nếu chưa có headers nào được tải, không thể cấu hình cột
    if (currentExcelHeaders.length === 0 && productsData.length === 0) {
        alert('Chưa có dữ liệu hoặc cấu trúc cột. Vui lòng tải một file Excel trước để cấu hình hiển thị cột.');
        return;
    }

    columnCheckboxesContainer.innerHTML = ''; // Xóa các checkbox cũ

    // Lấy tất cả các cột có thể hiển thị (từ Excel và cột "Số Lượng Thực Tế")
    const allPossibleColumns = [...currentExcelHeaders];
    // Chỉ thêm 'Số Lượng Thực Tế' nếu nó chưa tồn tại trong headers (để tránh trùng lặp nếu Excel đã có cột này)
    if (!allPossibleColumns.includes('Số Lượng Thực Tế')) {
        allPossibleColumns.push('Số Lượng Thực Tế');
    }


    allPossibleColumns.forEach(columnName => {
        const isChecked = visibleColumns.includes(columnName);
        const checkboxHTML = `
            <label>
                <input type="checkbox" value="${columnName}" ${isChecked ? 'checked' : ''}>
                ${columnName}
            </label>
        `;
        columnCheckboxesContainer.innerHTML += checkboxHTML;
    });

    columnVisibilityModal.style.display = 'flex';
}

// Đóng modal ẩn/hiện cột
function closeColumnVisibilityModal() {
    columnVisibilityModal.style.display = 'none';
}

// Áp dụng thay đổi hiển thị cột
function applyColumnVisibility() {
    const checkboxes = columnCheckboxesContainer.querySelectorAll('input[type="checkbox"]');
    visibleColumns = []; // Reset mảng cột hiển thị

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            visibleColumns.push(checkbox.value);
        }
    });

    renderTable(); // Render lại bảng với các cột đã chọn
    closeColumnVisibilityModal(); // Đóng modal
}

// --- Chức năng User Dropdown và Đổi mật khẩu ---

// Hiển thị/ẩn dropdown người dùng
function toggleUserDropdown() {
    console.log("Avatar clicked! Toggling dropdown."); // Để debug
    if (userDropdown) {
        userDropdown.classList.toggle('show');
    }
}

// Hiển thị modal đổi mật khẩu
function showChangePasswordModal() {
    closeLoginModal(); // Đóng modal đăng nhập nếu đang mở (đề phòng)
    userDropdown.classList.remove('show'); // Ẩn dropdown
    changePasswordError.textContent = ''; // Xóa thông báo lỗi cũ
    currentPasswordInput.value = '';
    newPasswordInput.value = '';
    confirmNewPasswordInput.value = '';
    changePasswordModal.style.display = 'flex';
}

// Đóng modal đổi mật khẩu
function closeChangePasswordModal() {
    changePasswordModal.style.display = 'none';
}

// Xử lý đổi mật khẩu
async function changePassword() {
    const currentPassword = currentPasswordInput.value;
    const newPassword = newPasswordInput.value;
    const confirmNewPassword = confirmNewPasswordInput.value;
    const user = auth.currentUser;
    changePasswordError.textContent = ''; // Xóa thông báo lỗi cũ

    if (!currentPassword || !newPassword || !confirmNewPassword) {
        changePasswordError.textContent = 'Vui lòng điền đầy đủ các trường.';
        return;
    }

    if (newPassword.length < 6) {
        changePasswordError.textContent = 'Mật khẩu mới phải có ít nhất 6 ký tự.';
        return;
    }

    if (newPassword !== confirmNewPassword) {
        changePasswordError.textContent = 'Mật khẩu mới và xác nhận mật khẩu không khớp.';
        return;
    }

    if (!user) {
        changePasswordError.textContent = 'Không có người dùng đang đăng nhập. Vui lòng đăng nhập lại.';
        console.error("Không có người dùng đang đăng nhập để đổi mật khẩu.");
        return;
    }

    try {
        // Để đổi mật khẩu, người dùng cần xác thực lại gần đây
        // Re-authenticate user with their current password
        const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
        await user.reauthenticateWithCredential(credential);

        // Sau khi xác thực lại thành công, cập nhật mật khẩu mới
        await user.updatePassword(newPassword);

        alert('Đổi mật khẩu thành công! Bạn sẽ được đăng xuất để đăng nhập lại với mật khẩu mới.');
        closeChangePasswordModal();
        logout(); // Đăng xuất người dùng để họ đăng nhập lại với mật khẩu mới
    } catch (error) {
        console.error("Lỗi khi đổi mật khẩu:", error.code, error.message);
        let errorMessage = 'Lỗi khi đổi mật khẩu. Vui lòng thử lại.';
        switch (error.code) {
            case 'auth/wrong-password':
                errorMessage = 'Mật khẩu hiện tại không đúng.';
                break;
            case 'auth/user-not-found': // Should not happen if user is logged in
                errorMessage = 'Người dùng không tồn tại.';
                break;
            case 'auth/requires-recent-login':
                errorMessage = 'Để đổi mật khẩu, bạn cần đăng nhập lại gần đây. Vui lòng đăng xuất và đăng nhập lại rồi thử đổi mật khẩu.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Mật khẩu quá yếu. Vui lòng chọn mật khẩu mạnh hơn (ít nhất 6 ký tự).';
                break;
            case 'auth/invalid-credential':
                errorMessage = 'Thông tin xác thực không hợp lệ. Vui lòng kiểm tra lại mật khẩu hiện tại.';
                break;
            default:
                errorMessage = 'Lỗi: ' + error.message;
        }
        changePasswordError.textContent = errorMessage;
    }
}