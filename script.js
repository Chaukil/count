// Constants and Variables
let isAdmin = false;
const ADMIN_PASSWORD = '123';
let workbook = null;
let originalData = null;
let savedData = new Map();

// Google Drive API Config
const DRIVE_API_CONFIG = {
    CLIENT_ID: '542897549830-u65s0fcgvnjqee8oqpavndr4nnehlkd0.apps.googleusercontent.com',
    API_KEY: 'AIzaSyC_5A03lw4TkaBDVwM-y7RMYJauROj0kEI',
    FOLDER_ID: '1WnyNjUm3XVa_ARM-SXFrZtEyIE6Lfehi',
    SCOPE: 'https://www.googleapis.com/auth/drive.file',
    DISCOVERY_DOCS: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
};

// Initialize when page loads
window.onload = function() {
    document.getElementById('roleScreen').classList.remove('hide');
    document.getElementById('mainScreen').classList.add('hide');
    initializeGoogleApi();
};

// Initialize Google API
function initializeGoogleApi() {
    gapi.load('client:auth2', async () => {
        try {
            await gapi.client.init({
                apiKey: DRIVE_API_CONFIG.API_KEY,
                clientId: DRIVE_API_CONFIG.CLIENT_ID,
                discoveryDocs: DRIVE_API_CONFIG.DISCOVERY_DOCS,
                scope: DRIVE_API_CONFIG.SCOPE
            });
            console.log('Google API initialized successfully');
        } catch (error) {
            console.error('Error initializing Google API:', error);
        }
    });
}

// Login functions
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

// File validation
function validateFile(input) {
    const file = input.files[0];
    if (file) {
        const fileType = file.type;
        const validTypes = [
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-excel'
        ];
        
        if (!validTypes.includes(fileType)) {
            alert('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
            input.value = '';
        }
    }
}

// Excel handling functions
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

function displayData(data) {
    if (!data || data.length === 0) {
        alert('Không có dữ liệu trong file Excel!');
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
            html += `<td>${row[header]}</td>`;
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
    const rowIndex = input.getAttribute('data-row');
    input.parentElement.classList.remove('saved-value');
}

function saveData() {
    if (!originalData) {
        alert('Chưa có dữ liệu để lưu!');
        return;
    }

    const inputs = document.getElementsByClassName('actual-qty');
    for (let input of inputs) {
        const rowIndex = input.getAttribute('data-row');
        const value = input.value.trim();
        
        if (value !== '') {
            savedData.set(parseInt(rowIndex), value);
            input.parentElement.classList.add('saved-value');
        }
    }

    localStorage.setItem('savedData', JSON.stringify([...savedData]));
    alert('Đã lưu dữ liệu thành công!');
}

// Export to Google Drive functions
async function exportToExcel() {
    if (!originalData) {
        alert('Vui lòng tải dữ liệu trước!');
        return;
    }

    try {
        const exportButton = document.getElementById('exportBtn');
        exportButton.disabled = true;
        exportButton.textContent = 'Đang xuất...';

        // Ensure user is signed in
        await gapi.auth2.getAuthInstance().signIn();

        // Create Excel file
        const exportData = originalData.map((row, index) => {
            const newRow = { ...row };
            newRow['Số lượng thực tế'] = savedData.get(index) || '';
            return newRow;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Kiểm Kê');

        // Convert to blob
        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Upload to Drive
        const file = await createFileInDrive(blob);
        console.log('File uploaded successfully:', file);
        alert('File đã được xuất thành công vào Google Drive!');

    } catch (error) {
        console.error('Error:', error);
        alert('Có lỗi khi xuất file: ' + error.message);
    } finally {
        const exportButton = document.getElementById('exportBtn');
        exportButton.disabled = false;
        exportButton.textContent = 'Xuất ra Excel';
    }
}

async function createFileInDrive(blob) {
    const fileName = `kiem_ke_${new Date().toLocaleString('vi-VN').replace(/[/:]/g, '_')}.xlsx`;
    
    // Create file metadata
    const metadata = {
        name: fileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        parents: [DRIVE_API_CONFIG.FOLDER_ID]
    };

    // Get the current access token
    const accessToken = gapi.auth.getToken().access_token;

    // Create form data
    const form = new FormData();
    form.append('metadata', new Blob(
        [JSON.stringify(metadata)],
        { type: 'application/json' }
    ));
    form.append('file', blob);

    // Upload file using fetch
    const response = await fetch(
        'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${accessToken}`
            },
            body: form
        }
    );

    if (!response.ok) {
        throw new Error('Upload failed: ' + response.statusText);
    }

    return response.json();
}

function clearData() {
    if (!isAdmin) {
        alert('Bạn không có quyền thực hiện chức năng này!');
        return;
    }

    if (confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu?')) {
        localStorage.clear();
        originalData = null;
        savedData = new Map();
        document.getElementById('tableContainer').innerHTML = '';
        document.getElementById('fileInput').value = '';
        alert('Đã xóa tất cả dữ liệu!');
    }
}
