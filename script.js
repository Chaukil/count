// Constants and Variables for Google Drive
const FOLDER_ID = '1WnyNjUm3XVa_ARM-SXFrZtEyIE6Lfehi'; // ID folder trong Drive
const SERVICE_ACCOUNT_KEY = {  
        "type": "service_account",
        "project_id": "inventory-management-460410",
        "private_key_id": "0a339c9f64fe7de10f6c1237a582c3851d18720d",
        "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC3k2MJz1pYjzqD\nWTSgyao8FinR2Ejo16OECxBzjfthZH+Yo8idqSRU/5tkz6zUS3uRYh3sMdXtZycv\nZ0YvDfre9O+PO2cXrnfTDkZgLXH/L7jamLA9k0xiaAZGdAJghLkheU5bYJq+snx3\nNvOVLUNA3bssCXe63y/LIkuEnxPyQKem5ca4DtVtySjByx5Pg85SJzCxg8bdqIlf\nEBgHv6F6IGsjFOtj28CAyR4iIL9xCSPdMmOveqWgtkSfU4rsaZmj8DYA7uVv3OYm\nOB5Zm42muW40sgZDC7pPRa/JYzs6HRYfOeLIgWLn2U0pxVjIy+3Fk1LfVjO3hfjy\nBASe1c5FAgMBAAECggEALgWnOJhhP/54XuGITh8ArJup1E/yx1z4Q2w6rZ2Uve/i\nBTRaYRw8XYrPPFDMNVTPH72HXuWHikLoEfxEHhvVHvws6q2rxMYaiDD197qs75rZ\nLwREestoxOrrV9JRnjzn5LpyqHnpkZFRntmJ64YzbBmqiPm+qHy3kKeCYzc2Wu7o\n6yUMELHE3Nofw6NacBbll1WymRa+ZLAgB2wDJ/C9BgNxx9DRWvL5lQuN0+T17VE6\n1f7YVH6t1vcxtHggC9JGX7uG5l9977UzDw9bM3w+d9FzLXmtJsn8RreQom9ipE+5\nBShQilmI5f9cCBuK34RPEywo6Jf52dvM0pJFDkKFKQKBgQD39NY5AFugveil+Qb5\n0gSAbF4BorkIvvqU2om9ByZK/pK6wyIdVCyjaz1gqe/jQS/iABYqOQFW/LTX43WG\n3gi+CrAEe++4A0ruaM6Jt2xD7cnE0H71g61UzBfK9Q7Egrylvwk7S3QUVWZvKlUR\nWhGiFCl0XzJ83U+n/KRMu6rffwKBgQC9h+X+v35EggWFt5wBCTWMMBafqrVPmGRm\nhGZHvqEs/l3Ln1LcVlr/asntSAhSCgfPyjMXuV0xgl135TD+WrC5acqzcASwOcHy\nMF1MarleqaL8hMBAwv89pQYz83YCTEP3g4noi6KGVD6LfN/TVe9jKp3Q1vHI9dvX\nQ1tMjjG0OwKBgQDCMYehRu18G5/cdQeImnoaFkUdpNKjzea0s99SIwpTi8Ng77iF\nHcqEBlYgoZcV9ZTJvGWfldu9w9biiesewEA6jmZCbMpW5IVH6N9xLi1lmhL+yIfW\nQtV6ZwlvU7PIJdgXO2HAhZyY3DWIdLABEfhjZsT8th31euKK3yvSSNxPgwKBgCEU\nylk3tWNhynL3hFxN7jHE5v4BftogwE2AiJW3OUywLVDwQzdAP2vbiNlIvGMNayWi\npl5atWCB36ygrXeH/tauF3pQcBEOU8LhHDfNXQOf2ln3FdN39bMdzcJdmVh3VVmr\ndPPJA5ostCoGps6tbjZB5v/ftJ4eA7xD/niTTSunAoGAHsR3GWWmQ3TAIl4CC/Vr\nlJcT8Fx7BBoyz0YpR/huMi+GZ7W7xDQ3hUTxj0R5g6NAGvdbt3gv3W+OcPqsLIPJ\ndPQI4sJgsFyfJ6QgrpCjVEYsAKtwDMiU5wdj6xjX4cU2lEudiFUTQyNFnT/SGvGW\ndwPa/ymCaKfYVBwtG8N3qDw=\n-----END PRIVATE KEY-----\n",
        "client_email": "drive-storage@inventory-management-460410.iam.gserviceaccount.com",
        "client_id": "104819673711849677823",
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/drive-storage%40inventory-management-460410.iam.gserviceaccount.com",
        "universe_domain": "googleapis.com"      
};

// Constants and Variables for Application
let isAdmin = false;
const ADMIN_PASSWORD = '123';
let workbook = null;
let originalData = null;
let savedData = new Map();
let jwtClient = null;

// Initialize when page loads
window.onload = function() {
    document.getElementById('roleScreen').classList.remove('hide');
    document.getElementById('mainScreen').classList.add('hide');
    initializeJWTClient();
};

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
    
    document.getElementById('exportBtn').style.display = isAdminScreen ? 'inline-block' : 'none';
    
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

// Google Drive Service Account initialization
async function initializeJWTClient() {
    if (!jwtClient) {
        jwtClient = new google.auth.JWT(
            SERVICE_ACCOUNT_KEY.client_email,
            null,
            SERVICE_ACCOUNT_KEY.private_key,
            ['https://www.googleapis.com/auth/drive.file'],
            'chauchikil01@gmail.com' // Email tài khoản Drive đích
        );

        try {
            await jwtClient.authorize();
            console.log('JWT client initialized');
        } catch (error) {
            console.error('Error initializing JWT client:', error);
            throw error;
        }
    }
    return jwtClient;
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

        await uploadToGoogleDrive();

        exportButton.disabled = false;
        exportButton.textContent = 'Xuất ra Excel';
    } catch (err) {
        console.error('Error:', err);
        alert('Có lỗi khi xuất file: ' + err.message);
        
        const exportButton = document.getElementById('exportBtn');
        exportButton.disabled = false;
        exportButton.textContent = 'Xuất ra Excel';
    }
}

async function uploadToGoogleDrive() {
    try {
        // Ensure JWT client is initialized
        const auth = await initializeJWTClient();

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

        // Prepare metadata
        const metadata = {
            name: `kiem_ke_${new Date().toLocaleString('vi-VN').replace(/[/:]/g, '_')}.xlsx`,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            parents: [FOLDER_ID]
        };

        // Create form data
        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', blob);

        // Upload to Drive
        const response = await fetch(
            'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${auth.credentials.access_token}`
                },
                body: form
            }
        );

        if (!response.ok) {
            throw new Error('Upload failed: ' + response.statusText);
        }

        const result = await response.json();
        console.log('File uploaded successfully:', result);
        alert('File đã được xuất thành công vào Google Drive!');

    } catch (error) {
        console.error('Error in uploadToGoogleDrive:', error);
        alert('Lỗi khi tải lên Google Drive: ' + error.message);
        throw error;
    }
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

// Add event listener for Google API load
document.addEventListener('DOMContentLoaded', function() {
    // Load the Google API client
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = function() {
        gapi.load('client:auth2', initializeJWTClient);
    };
    document.body.appendChild(script);
});
