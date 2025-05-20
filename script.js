// Variables 
let isAdmin = false; 
const ADMIN_PASSWORD = '123'; 
let workbook = null; 
let originalData = null; 
let savedData = new Map();

// Initialize when page loads 
window.onload = function() { document.getElementById('roleScreen').classList.remove('hide'); document.getElementById('mainScreen').classList.add('hide'); };

// Login functions 
function showPasswordModal() { document.getElementById('passwordModal').style.display = 'flex'; }

function closePasswordModal() { document.getElementById('passwordModal').style.display = 'none'; document.getElementById('adminPassword').value = ''; }

function checkPassword() { const password = document.getElementById('adminPassword').value; if (password === ADMIN_PASSWORD) { isAdmin = true; showMainScreen(true); closePasswordModal(); } else { alert('Mật khẩu không đúng!'); } }

function showInventoryScreen() { isAdmin = false; showMainScreen(false); }

function showMainScreen(isAdminScreen) { document.getElementById('roleScreen').classList.add('hide'); document.getElementById('mainScreen').classList.remove('hide');

const adminControls = document.getElementById('adminControls');
if (isAdminScreen) {
    adminControls.classList.add('show');
} else {
    adminControls.classList.remove('show');
}

document.getElementById('exportBtn').style.display = isAdminScreen ? 'inline-block' : 'none';

document.getElementById('screenTitle').textContent = 
    isAdminScreen ? 'Xin chào, Châu Chí Kil!   [Admin]' : 'Màn hình Kiểm kê';

const storedData = localStorage.getItem('excelData');
const storedSavedData = localStorage.getItem('savedData');

if (storedData && storedSavedData) {
    originalData = JSON.parse(storedData);
    savedData = new Map(JSON.parse(storedSavedData));
    displayData(originalData);
}
}

function logout() { isAdmin = false; document.getElementById('mainScreen').classList.add('hide'); document.getElementById('roleScreen').classList.remove('hide'); }

// File validation 
function validateFile(input) { const file = input.files[0]; if (file) { const fileType = file.type; const validTypes = [ 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel' ];

    if (!validTypes.includes(fileType)) {
        alert('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
        input.value = '';
    }
}
}

// Excel handling functions 
function loadExcel() { if (!isAdmin) { alert('Bạn không có quyền thực hiện chức năng này!'); return; }

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

function displayData(data) { if (!data || data.length === 0) { alert('Không có dữ liệu trong file Excel!'); return; }

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

function handleInputChange(input) { const rowIndex = input.getAttribute('data-row'); input.parentElement.classList.remove('saved-value'); }

function saveData() { if (!originalData) { alert('Chưa có dữ liệu để lưu!'); return; }

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

function exportToExcel() { if (!isAdmin) { alert('Bạn không có quyền thực hiện chức năng này!'); return; }

if (!originalData) {
    alert('Vui lòng tải dữ liệu trước!');
    return;
}

const exportData = originalData.map((row, index) => {
    const newRow = { ...row };
    newRow['Số lượng thực tế'] = savedData.get(index) || '';
    return newRow;
});

const newWb = XLSX.utils.book_new();
const newWs = XLSX.utils.json_to_sheet(exportData);

XLSX.utils.book_append_sheet(newWb, newWs, 'Kiểm Kê');
XLSX.writeFile(newWb, 'kiem_ke_thuc_te.xlsx');
}

function clearData() { if (!isAdmin) { alert('Bạn không có quyền thực hiện chức năng này!'); return; }

if (confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu?')) {
    localStorage.clear();
    originalData = null;
    savedData = new Map();
    document.getElementById('tableContainer').innerHTML = '';
    document.getElementById('fileInput').value = '';
    //alert('Đã xóa tất cả dữ liệu!');
}
}