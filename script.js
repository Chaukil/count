// Constants and Variables
let isAdmin = false;
const ADMIN_PASSWORD = '123';
let workbook = null;
let originalData = null;
let savedData = new Map();

// Google Drive Service Account Config
const SERVICE_ACCOUNT_CONFIG = {
    "type": "service_account",
  "project_id": "inventory-carton",
  "private_key_id": "4b3e9ffaf3651b1e6dc5dd32268931fe830ca8e8",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCxXrYsWiTsQOS2\nTZGpxFF4BuWJhv7u+w7yhAcMS2gylgRftsw5HSj3MfkS/GUUi/UmY7l6tXo133tL\nUi6p6SV2JQPbQVOI/exONxnVwomznjo+E3iStI3F26jEsOpMBcB2rjvNTHtn766M\n+06pyZNmx3ZaxHvCp9tM5fvhJdIqcQFyYMPb+3hndgPL/h0luJKd6rYGBgoekewr\nklaJqBzB5jBcsQ/XgwZ1ltT6k7WRyPMDIf8z7j06Okao8wB3DrypL4W2z7wbyl8U\nEVnAeJyEcvGQ8X1zccRC7N+GVhTjF8QzCh9py1BSAsdSXuMCsmdcGfLUlOWxCB82\nLCWsfMXFAgMBAAECggEACH9xfdXUPtCPVmpr3yo9flL+Q6hsbNRGOkebgfL0RAyg\nKT48B0R8DWktZ+A85/moobU5NdO6Bxi8DyjEfSCcH6PxPs1n4blZlG1M866FXNw+\nKePgs/lU/1E2u/vxBqT1rjLZQRP/GZoIB93Nk5J0POXP/X7YojWiI8td5BglAls9\nd19z3z9baU09zd1mRlaeJ8gM6RzheIKYMnjxdz1IfHVSL4IaAaPcCvVROva3IoGQ\ni2rTG0RrJJ1Jffgp7CB4uJ+tZyZ3PMCjnRm6XvdB+Emdi8CFQvmvfEYpe/Kw4XML\n5MmO0iuMeHExU785EaTVC8X8V2s7UAz9OaWRVc/9ZQKBgQD4SjpmnHI/LE4/xYVH\nwVM37I0vPSjGRAHTJu27Et6wCKq8xaXFj1lfCKZC2VZOfDTKRH2SN5cKjxZbqr8U\nLgprmnGXGDBXPgCmaU4gQjBB88IiCC3Xm0wXLzdHCJ7E//sNeioauj3b4TlGTu7U\n8ymqJ18Jywah+r1fkLyr4EzrdwKBgQC24LUpDmPbBsuLf0RcdPuV8VnPanoTOqWj\nCVnwQEDtUeSj8W4cF7nM6vClYnXgvQ0KBJD13FG/RYIDyOsWgQGHnyEEl8Q96agH\nLQygwVvokRren7SXLrzswaUXdoSYZLwynk3kL5chzfgKgfmhu/abAQJlIbAICP6l\n68cfp/gvowKBgQD0WJiAwxXr9b5MJCa2Jxuuva1z/8xQ0jy5gGYU5M0ikGT2wcwS\nULCzRd/ZienV84ZASIcLjommaoqmS7MgOO8oViXTfIqWUP5yxs+MD5dOUIWM2F/E\n/6AycNUFowYc+Y4oBUHKa97UtSGYf7Wq/GLUgUqWaKduYURc+CO1QlhwoQKBgA/5\nrzmn7Scr/8nu0yz0dynRDJRm68UUQXXtkjK/mixhFAUSSRkhJXT2LRF1eXCpcyMl\n5PflSCraSpJEEe1EVbrgNsUs8NKrv6bo04qTeZDmZB+Aegke5xgTjnVvQAQEAMC3\nPXyqf5xPXtSkKAdt4QwHWYs2FyeMiZo674kfZjnbAoGABk08J+ntclVRBIJClhNk\n+w33lDKTuTd9/bkcuBQY1/hLui53B74V/y0BoWUfK5Wzup/eqhlhPozub+ilTl9O\nP2WsnfLkspLWJLxFZnpoO/M1OVOlGhvZaaVxmGLuhIi1+KV4QIUnAfhM+xHuIgld\nrQe9x65DN6haSSmoltHFP6k=\n-----END PRIVATE KEY-----\n",
  "client_email": "drive-access@inventory-carton.iam.gserviceaccount.com",
  "client_id": "106391728142192168303",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/drive-access%40inventory-carton.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
};

const FOLDER_ID = '1WnyNjUm3XVa_ARM-SXFrZtEyIE6Lfehi'; // ID folder từ Google Drive

// Initialize when page loads
window.onload = function() {
    document.getElementById('roleScreen').classList.remove('hide');
    document.getElementById('mainScreen').classList.add('hide');
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

// Export function
async function exportToExcel() {
    if (!originalData) {
        alert('Vui lòng tải dữ liệu trước!');
        return;
    }

    try {
        const exportButton = document.getElementById('exportBtn');
        exportButton.disabled = true;
        exportButton.textContent = 'Đang xuất...';

        // Get access token using service account
        const accessToken = await getServiceAccountToken();

        // Create Excel file
        const exportData = originalData.map((row, index) => {
            const newRow = { ...row };
            newRow['Số lượng thực tế'] = savedData.get(index) || '';
            return newRow;
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(exportData);
        XLSX.utils.book_append_sheet(wb, ws, 'Kiểm Kê');

        const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });

        // Upload to Drive
        const metadata = {
            name: `kiem_ke_${new Date().toLocaleString('vi-VN').replace(/[/:]/g, '_')}.xlsx`,
            mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            parents: [FOLDER_ID]
        };

        const form = new FormData();
        form.append('metadata', new Blob(
            [JSON.stringify(metadata)],
            { type: 'application/json' }
        ));
        form.append('file', blob);

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

        const result = await response.json();
        console.log('File uploaded successfully:', result);
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

// Service Account Authentication
async function getServiceAccountToken() {
    try {
        // Create JWT claim
        const now = Math.floor(Date.now() / 1000);
        const claim = {
            iss: SERVICE_ACCOUNT_CONFIG.client_email,
            scope: 'https://www.googleapis.com/auth/drive.file',
            aud: 'https://oauth2.googleapis.com/token',
            exp: now + 3600,
            iat: now
        };

        // Sign JWT
        const signedJwt = jwt.encode(claim, SERVICE_ACCOUNT_CONFIG.private_key, 'RS256');

        // Exchange JWT for access token
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`
        });

        if (!response.ok) {
            throw new Error('Failed to get access token');
        }

        const data = await response.json();
        return data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error);
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
