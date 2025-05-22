// File: script.js

// Constants and Variables
let isAdmin = false;
const ADMIN_PASSWORD = '123'; // Vẫn giữ nguyên mật khẩu Admin
let workbook = null;
let originalData = null;
let savedData = new Map();

// **URL Web App của Google Apps Script của bạn**
// Dán URL bạn nhận được sau khi triển khai Apps Script Web App vào đây!
const GOOGLE_APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwWkQc8m5h7QZrbcONTQTiwE-5kAJ--gYtqCi0R5lsXEwk22kU5jYD6VBCVKbO0wmol/exec";

// Khởi tạo khi trang tải
window.onload = function() {
    document.getElementById('roleScreen').classList.remove('hide');
    document.getElementById('mainScreen').classList.add('hide');
};

// Hàm đăng nhập và hiển thị màn hình
function showPasswordModal() {
    document.getElementById('passwordModal').style.display = 'flex';
}

function closePasswordModal() {
    document.getElementById('passwordModal').style.display = 'none';
    document.getElementById('adminPassword').value = '';
}

function checkPassword() {
    const password = document.getElementById('adminPassword').value;
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        showMainScreen(true);
        closePasswordModal();
    } else {
        alert('Mật khẩu không đúng!');
    }
}

function showInventoryScreen() {
    isAdmin = false;
    showMainScreen(false);
}

function showMainScreen(isAdminScreen) {
    document.getElementById('roleScreen').classList.add('hide');
    document.getElementById('mainScreen').classList.remove('hide');

    const adminControls = document.getElementById('adminControls');
    if (isAdminScreen) {
        adminControls.classList.add('show');
    } else {
        adminControls.classList.remove('show');
    }

    document.getElementById('exportBtn').style.display = 'inline-block';

    document.getElementById('screenTitle').textContent =
        isAdminScreen ? 'Màn hình Admin' : 'Màn hình Kiểm kê';

    const storedData = localStorage.getItem('excelData');
    const storedSavedData = localStorage.getItem('savedData');

    if (storedData && storedSavedData) {
        originalData = JSON.parse(storedData);
        savedData = new Map(JSON.parse(storedSavedData));
        displayData(originalData);
    }
}

function logout() {
    isAdmin = false;
    document.getElementById('mainScreen').classList.add('hide');
    document.getElementById('roleScreen').classList.remove('hide');
}

// Hàm kiểm tra định dạng file
function validateFile(input) {
    const file = input.files[0];
    if (file) {
        const fileType = file.type;
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
            'application/vnd.ms-excel' // .xls
        ];

        if (!validTypes.includes(fileType)) {
            alert('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
            input.value = ''; // Xóa file đã chọn
        }
    }
}

// Hàm tải file Excel
function loadExcel() {
    if (!isAdmin) {
        alert('Bạn không có quyền thực hiện chức năng này!');
        return;
    }

    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('Vui lòng chọn file Excel!');
        return;
    }

    if (originalData && !confirm('Tải file mới sẽ xóa dữ liệu hiện tại. Bạn có muốn tiếp tục?')) {
        fileInput.value = '';
        return;
    }

    const loadButton = document.querySelector('button[onclick="loadExcel()"]');
    loadButton.textContent = 'Đang tải...';
    loadButton.disabled = true;

    // Xóa dữ liệu đã lưu khi tải file mới
    savedData = new Map();
    localStorage.removeItem('savedData');

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            workbook = XLSX.read(data, { type: 'array' });

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            originalData = XLSX.utils.sheet_to_json(firstSheet);

            localStorage.setItem('excelData', JSON.stringify(originalData));

            displayData(originalData);
        } catch (error) {
            alert('Lỗi khi đọc file Excel: ' + error.message);
        } finally {
            loadButton.textContent = 'Tải Excel';
            loadButton.disabled = false;
        }
    };
    reader.readAsArrayBuffer(file);
}

// Hàm hiển thị dữ liệu lên bảng HTML
function displayData(data) {
    if (!data || data.length === 0) {
        const tableContainer = document.getElementById('tableContainer');
        tableContainer.innerHTML = '<p>Không có dữ liệu để hiển thị. Vui lòng tải file Excel.</p>';
        return;
    }

    const container = document.getElementById('tableContainer');
    let html = '<table><thead><tr>';

    const headers = Object.keys(data[0]);
    headers.forEach(header => {
        html += `<th>${header}</th>`;
    });
    html += '<th>Số Lượng Thực Tế</th></tr></thead><tbody>';

    data.forEach((row, index) => {
        html += '<tr>';
        headers.forEach(header => {
            // Hiển thị nội dung ô, có thể giới hạn chiều dài nếu cần
            const cellContent = String(row[header] !== undefined ? row[header] : '');
            html += `<td>${cellContent}</td>`;
        });

        const savedValue = savedData.get(index);
        const value = savedValue !== undefined ? savedValue : '';
        const savedClass = savedValue !== undefined ? 'saved-value' : '';

        html += `<td class="${savedClass}">
                    <input type="number"
                           class="actual-qty"
                           data-row="${index}"
                           value="${value}"
                           onchange="handleInputChange(this)">
                    </td>`;
        html += '</tr>';
    });

    html += '</tbody></table>';
    container.innerHTML = html;
}

function handleInputChange(input) {
    // const rowIndex = input.getAttribute('data-row'); // Không cần thiết ở đây
    input.parentElement.classList.remove('saved-value'); // Xóa class "saved-value" khi có thay đổi
}

// Hàm lưu dữ liệu đã nhập
function saveData() {
    if (!originalData) {
        alert('Chưa có dữ liệu để lưu!');
        return;
    }

    const inputs = document.getElementsByClassName('actual-qty');
    for (let input of inputs) {
        const rowIndex = parseInt(input.getAttribute('data-row'));
        const value = input.value.trim();

        if (value !== '') {
            savedData.set(rowIndex, value);
            input.parentElement.classList.add('saved-value'); // Thêm class khi lưu thành công
        } else {
            // Nếu người dùng xóa giá trị, cũng xóa khỏi savedData
            savedData.delete(rowIndex);
            input.parentElement.classList.remove('saved-value');
        }
    }

    localStorage.setItem('savedData', JSON.stringify([...savedData]));
    alert('Đã lưu dữ liệu thành công!');
}


// **Hàm xuất file Excel lên Google Drive - ĐÃ ĐƯỢC CHỈNH SỬA**
async function exportToExcel() {
    if (!originalData || originalData.length === 0) {
        alert('Vui lòng tải dữ liệu trước khi xuất!');
        return;
    }

    const exportButton = document.getElementById('exportBtn');
    exportButton.disabled = true;
    exportButton.textContent = 'Đang xuất...';

    try {
        // Chuẩn bị dữ liệu để xuất (kết hợp dữ liệu gốc và số lượng thực tế đã lưu)
        const exportData = originalData.map((row, index) => {
            const newRow = { ...row }; // Tạo bản sao của hàng gốc
            newRow['Số lượng thực tế'] = savedData.get(index) || '';
            return newRow;
        });

        // Tạo workbook Excel mới
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Kiểm Kê');

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });

        const reader = new FileReader();
        reader.readAsDataURL(blob);

        reader.onloadend = function() {
            const base64data = reader.result.split(',')[1];
            const filename = `kiem_ke_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}_${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/:/g, '-')}.xlsx`;

            // **Sử dụng XMLHttpRequest thay vì fetch**
            const xhr = new XMLHttpRequest();
            xhr.open('POST', GOOGLE_APPS_SCRIPT_WEB_APP_URL, true);
            xhr.setRequestHeader('Content-Type', 'application/json');

            xhr.onload = function() {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const result = JSON.parse(xhr.responseText);
                        if (result.status === "success") {
                            console.log('File đã được tải lên Google Drive thành công:', result);
                            alert('File đã được xuất thành công vào Google Drive!');
                        } else {
                            alert('Có lỗi từ Google Apps Script: ' + (result.message || "Lỗi không xác định."));
                        }
                    } catch (parseError) {
                        console.error('Lỗi phân tích phản hồi JSON:', parseError, 'Phản hồi:', xhr.responseText);
                        alert('Có lỗi khi xử lý phản hồi từ server.');
                    }
                } else {
                    console.error('Lỗi khi gửi dữ liệu đến Google Apps Script (XHR Status):', xhr.status, xhr.statusText, xhr.responseText);
                    alert('Có lỗi khi tải file lên Google Drive. Status: ' + xhr.status);
                }
                exportButton.disabled = false;
                exportButton.textContent = 'Xuất ra Excel';
            };

            xhr.onerror = function() {
                console.error('Lỗi mạng hoặc CORS (XHR onerror): Không thể kết nối đến Google Apps Script Web App.', xhr);
                alert('Lỗi mạng hoặc CORS: Không thể tải file lên Google Drive.');
                exportButton.disabled = false;
                exportButton.textContent = 'Xuất ra Excel';
            };

            xhr.send(JSON.stringify({
                filename: filename,
                fileContent: base64data
            }));
        };

    } catch (error) {
        console.error('Lỗi khi chuẩn bị file Excel để xuất:', error);
        alert('Có lỗi khi xuất file: ' + error.message);
        exportButton.disabled = false;
        exportButton.textContent = 'Xuất ra Excel';
    }
}


// Hàm xóa dữ liệu
function clearData() {
    if (!isAdmin) {
        alert('Bạn không có quyền thực hiện chức năng này!');
        return;
    }

    if (confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu? Thao tác này không thể hoàn tác.')) {
        localStorage.clear();
        originalData = null;
        savedData = new Map();
        document.getElementById('tableContainer').innerHTML = '';
        document.getElementById('fileInput').value = '';
        alert('Đã xóa tất cả dữ liệu thành công!');
    }
}
