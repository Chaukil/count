// File: script.js (Không thay đổi so với phiên bản trước đó của tôi)

// Constants and Variables
let isAdmin = false;
const ADMIN_PASSWORD = '123';
let workbook = null;
let originalData = null; // Dữ liệu gốc từ file Excel
let savedData = new Map(); // Dữ liệu số lượng thực tế đã nhập (RowIndex -> Value)

// **URL Web App của Google Apps Script của bạn**
// Dán URL bạn nhận được sau khi triển khai Apps Script Web App vào đây!
const GOOGLE_APPS_SCRIPT_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwWkQc8m5h7QZrbcONTQTiwE-5kAJ--gYtqCi0R5lsXEwk22kU5jYD6VBCVKbO0wmol/exec";


// Khởi tạo khi trang tải
window.onload = async function() {
    document.getElementById('roleScreen').classList.remove('hide');
    document.getElementById('mainScreen').classList.add('hide');

    // Tải dữ liệu từ Google Sheet khi ứng dụng khởi động
    await loadDataFromGoogleSheet();
};

// Hàm đăng nhập và hiển thị màn hình (giữ nguyên)
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

    // Nút xuất Excel sẽ không còn cần thiết cho việc tải file nhị phân
    // Có thể ẩn đi hoặc thay đổi chức năng
    document.getElementById('exportBtn').style.display = 'none'; // Ẩn nút xuất Excel

    document.getElementById('screenTitle').textContent =
        isAdminScreen ? 'Màn hình Admin' : 'Màn hình Kiểm kê';

    // Dữ liệu đã được tải từ Google Sheet khi khởi động ứng dụng
    // Bây giờ chỉ cần hiển thị nếu có
    if (originalData) {
        displayData(originalData);
    } else {
        document.getElementById('tableContainer').innerHTML = '<p>Không có dữ liệu. Vui lòng tải file Excel hoặc chờ dữ liệu đồng bộ.</p>';
    }
}

function logout() {
    isAdmin = false;
    document.getElementById('mainScreen').classList.add('hide');
    document.getElementById('roleScreen').classList.remove('hide');
}

// Hàm kiểm tra định dạng file (giữ nguyên)
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

// Hàm tải file Excel và lưu vào Original Data (không lưu vào localStorage nữa)
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

    if (originalData && !confirm('Tải file mới sẽ xóa dữ liệu gốc hiện tại trên Sheet và dữ liệu kiểm kê. Bạn có muốn tiếp tục?')) {
        fileInput.value = '';
        return;
    }

    const loadButton = document.querySelector('button[onclick="loadExcel()"]');
    loadButton.textContent = 'Đang tải...';
    loadButton.disabled = true;

    // Xóa dữ liệu đã lưu cục bộ khi tải file mới
    savedData = new Map();

    const reader = new FileReader();
    reader.onload = async function(e) { // Thêm async ở đây
        try {
            const data = new Uint8Array(e.target.result);
            workbook = XLSX.read(data, { type: 'array' });

            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            originalData = XLSX.utils.sheet_to_json(firstSheet);

            // Ghi originalData và savedData (rỗng) lên Google Sheet ngay lập tức
            await sendDataToGoogleSheet(originalData, savedData);

            displayData(originalData);
        } catch (error) {
            alert('Lỗi khi đọc file Excel hoặc lưu vào Sheet: ' + error.message);
        } finally {
            loadButton.textContent = 'Tải Excel';
            loadButton.disabled = false;
        }
    };
    reader.readAsArrayBuffer(file);
}

// Hàm hiển thị dữ liệu lên bảng HTML (giữ nguyên)
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
    input.parentElement.classList.remove('saved-value');
}

// Hàm lưu dữ liệu đã nhập và gửi lên Google Sheet
async function saveData() {
    if (!originalData) {
        alert('Chưa có dữ liệu để lưu!');
        return;
    }

    const inputs = document.getElementsByClassName('actual-qty');
    const tempSavedData = new Map(); // Dữ liệu tạm thời để cập nhật savedData và gửi đi

    for (let input of inputs) {
        const rowIndex = parseInt(input.getAttribute('data-row'));
        const value = input.value.trim();

        if (value !== '') {
            tempSavedData.set(rowIndex, value);
            input.parentElement.classList.add('saved-value');
        } else {
            input.parentElement.classList.remove('saved-value');
        }
    }
    savedData = tempSavedData; // Cập nhật savedData toàn cục

    await sendDataToGoogleSheet(originalData, savedData); // Gửi cả originalData và savedData
}

// Hàm gửi dữ liệu lên Google Sheet qua Apps Script
async function sendDataToGoogleSheet(original, saved) {
    const saveButton = document.querySelector('button[onclick="saveData()"]');
    if (saveButton) { // Kiểm tra nếu nút "Lưu Dữ Liệu" tồn tại
        saveButton.disabled = true;
        saveButton.textContent = 'Đang lưu...';
    } else { // Nếu gọi từ loadExcel, thì dùng nút tải Excel
        const loadButton = document.querySelector('button[onclick="loadExcel()"]');
        if (loadButton) {
            loadButton.disabled = true;
            loadButton.textContent = 'Đang lưu...';
        }
    }


    try {
        const response = await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: "saveData", // Cho biết hành động là lưu dữ liệu
                originalData: original,
                // Chuyển Map thành mảng các cặp key-value để gửi qua JSON
                savedData: Array.from(saved.entries())
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Lỗi từ server: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        if (result.status === "success") {
            console.log('Dữ liệu đã được lưu và đồng bộ lên Google Sheet:', result);
            alert('Đã lưu và đồng bộ dữ liệu thành công!');
        } else {
            throw new Error(result.message || "Lỗi không xác định từ Google Apps Script.");
        }
    } catch (error) {
        console.error('Lỗi khi gửi dữ liệu lên Google Sheet:', error);
        alert('Có lỗi khi lưu hoặc đồng bộ dữ liệu: ' + error.message);
    } finally {
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = 'Lưu Dữ Liệu';
        }
        const loadButton = document.querySelector('button[onclick="loadExcel()"]');
        if (loadButton && loadButton.textContent === 'Đang lưu...') { // Chỉ đổi lại nếu nó đang ở trạng thái 'Đang lưu...'
             loadButton.textContent = 'Tải Excel';
             loadButton.disabled = false;
        }
    }
}

// Hàm tải dữ liệu từ Google Sheet về
async function loadDataFromGoogleSheet() {
    try {
        const response = await fetch(GOOGLE_APPS_SCRIPT_WEB_APP_URL, {
            method: 'POST', // Vẫn là POST vì doGet không được định nghĩa
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: "loadData" // Cho biết hành động là tải dữ liệu
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Lỗi khi tải dữ liệu từ server: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        if (result.status === "success") {
            console.log('Dữ liệu đã được tải về từ Google Sheet:', result);
            originalData = result.originalData;
            savedData = new Map(result.savedData); // Chuyển lại thành Map

            if (document.getElementById('mainScreen').classList.contains('show')) {
                displayData(originalData); // Chỉ hiển thị nếu mainScreen đang hiển thị
            }
        } else {
            throw new Error(result.message || "Lỗi không xác định khi tải dữ liệu từ Google Sheet.");
        }
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu ban đầu từ Google Sheet:', error);
        // Không alert lỗi nghiêm trọng khi khởi động, chỉ log
    }
}


// Hàm xóa dữ liệu (sẽ xóa cả trên Google Sheet)
async function clearData() {
    if (!isAdmin) {
        alert('Bạn không có quyền thực hiện chức năng này!');
        return;
    }

    if (confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu? Thao tác này sẽ xóa trên cả Google Sheet và không thể hoàn tác.')) {
        originalData = null;
        savedData = new Map();
        document.getElementById('tableContainer').innerHTML = '';
        document.getElementById('fileInput').value = '';

        // Gửi lệnh xóa lên Google Sheet bằng cách gửi dữ liệu rỗng
        await sendDataToGoogleSheet(null, new Map()); // Gửi null cho originalData và Map rỗng cho savedData

        alert('Đã xóa tất cả dữ liệu thành công!');
    }
}
