// Cấu hình Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC-sC4qy1Xy6Q8O2EcOh_jKa7rSkvdA9w8",
    authDomain: "inventorynew-aa3f1.firebaseapp.com",
    projectId: "inventorynew-aa3f1",
    storageBucket: "inventorynew-aa3f1.firebasestorage.app",
    messagingSenderId: "1068757151671",
    appId: "1:1068757151671:web:8874f1c0399f124a520232",
    measurementId: "G-64E256GGPT"
};

// Khởi tạo Firebase
firebase.initializeApp(firebaseConfig);
let db = firebase.firestore();

// Biến toàn cục
let currentRole = null;
let currentCategory = null;
let tableData = [];
let columnVisibility = {};
let currentSortColumn = null;
let currentSortDirection = 'asc';

// Collections reference
const categoriesRef = db.collection('categories');
const inventoryRef = db.collection('inventory');

// Tải danh sách danh mục từ Firebase
async function loadCategories() {
    try {
        console.log('Loading categories...'); // Debug log

        const snapshot = await db.collection('categories').get();
        const categoryButtons = document.getElementById('categoryButtons');

        if (!categoryButtons) {
            console.error('Category buttons container not found');
            return;
        }

        categoryButtons.innerHTML = '';

        if (snapshot.empty) {
            categoryButtons.innerHTML = '<p class="no-data">Chưa có danh mục nào</p>';
            return;
        }

        snapshot.forEach(doc => {
            const category = { id: doc.id, ...doc.data() };
            const categoryCard = document.createElement('div');
            categoryCard.className = 'category-card';
            categoryCard.onclick = () => selectCategory(category);

            // Format timestamp
            const lastUploadTime = category.lastUploadTime ? 
                formatTimestamp(category.lastUploadTime) : 'Chưa có dữ liệu';

            categoryCard.innerHTML = `
                <div class="category-content">
                    <h3>${category.name}</h3>
                    <p>${category.description || ''}</p>
                    <div class="category-info">
                        <span class="upload-time">
                            <i class="fas fa-clock"></i>
                            Lần cập nhật cuối: <b>${lastUploadTime}</b>
                        </span>
                    </div>
                </div>
            `;
            categoryButtons.appendChild(categoryCard);
        });

        console.log('Categories loaded successfully'); // Debug log

    } catch (error) {
        console.error('Error loading categories:', error);
        showMessage('Lỗi khi tải danh sách danh mục', 'error');
    }
}

function formatTimestamp(timestamp) {
    if (!timestamp) return 'Chưa có dữ liệu';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

async function selectCategory(category) {
    try {
        console.log('Selecting category:', category);
        currentCategory = category;

        // Ẩn màn hình danh mục
        document.getElementById('categoryScreen').classList.add('hide');
        
        // Hiển thị màn hình kiểm kê
        const mainScreen = document.getElementById('mainScreen');
        mainScreen.classList.remove('hide');

        // Cập nhật tiêu đề
        document.getElementById('screenTitle').textContent = `KIỂM KÊ - ${category.name}`;

        // Hiển thị/ẩn controls theo vai trò
        const adminControls = document.getElementById('adminControls');
        if (adminControls) {
            adminControls.classList.toggle('hide', currentRole !== 'admin');
        }

        // Hiển thị controls chung
        const commonControls = document.getElementById('commonControls');
        if (commonControls) {
            commonControls.classList.remove('hide');
        }

        // Tải dữ liệu kiểm kê
        await loadInventoryData(category.id);

        console.log('Category selection completed');
    } catch (error) {
        console.error('Error selecting category:', error);
        showMessage('Lỗi khi chọn danh mục', 'error');
    }
}

function backToCategories() {
    try {
        // Ẩn màn hình kiểm kê
        document.getElementById('mainScreen').classList.add('hide');
        
        // Hiện màn hình danh mục
        document.getElementById('categoryScreen').classList.remove('hide');
        
        // Reset dữ liệu hiện tại
        currentCategory = null;
        tableData = [];
        
        // Xóa bảng dữ liệu
        const tableContainer = document.getElementById('tableContainer');
        if (tableContainer) {
            tableContainer.innerHTML = '';
        }
    } catch (error) {
        console.error('Error returning to categories:', error);
        showMessage('Lỗi khi quay lại danh mục', 'error');
    }
}

function showColumnVisibilityModal() {
    try {
        const modal = document.getElementById('columnVisibilityModal');
        const container = document.getElementById('columnCheckboxes');
        
        if (!modal || !container) {
            throw new Error('Modal elements not found');
        }

        // Xóa nội dung cũ
        container.innerHTML = '';

        // Tạo checkbox cho mỗi cột (trừ STT và Số lượng thực tế)
        const checkboxesHTML = currentHeaders.map(header => {
            const isChecked = columnVisibility[header] !== false; // Mặc định hiển thị
            return `
                <label class="checkbox-container">
                    <input type="checkbox" 
                           value="${header}" 
                           ${isChecked ? 'checked' : ''}>
                    <span class="checkbox-label">${header}</span>
                </label>
            `;
        }).join('');

        container.innerHTML = checkboxesHTML;

        // Hiển thị modal
        modal.style.display = 'flex';
        modal.classList.remove('hide');

    } catch (error) {
        console.error('Error showing column visibility modal:', error);
        showMessage('Lỗi khi mở cài đặt hiển thị cột', 'error');
    }
}

function applyColumnVisibility() {
    try {
        const checkboxes = document.querySelectorAll('#columnCheckboxes input[type="checkbox"]');
        
        // Cập nhật trạng thái hiển thị
        checkboxes.forEach(checkbox => {
            columnVisibility[checkbox.value] = checkbox.checked;
        });

        // Đóng modal
        closeModal('columnVisibilityModal');

        // Render lại bảng với cột đã chọn
        renderTableWithVisibility();

        showMessage('Đã cập nhật hiển thị cột', 'success');

    } catch (error) {
        console.error('Error applying column visibility:', error);
        showMessage('Lỗi khi cập nhật hiển thị cột', 'error');
    }
}

function renderTableWithVisibility() {
    try {
        const tableContainer = document.getElementById('tableContainer');
        if (!tableContainer) return;

        if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
            tableContainer.innerHTML = '<p class="no-data">Chưa có dữ liệu kiểm kê</p>';
            return;
        }

        // Kiểm tra headers
        if (!currentHeaders || !Array.isArray(currentHeaders) || currentHeaders.length === 0) {
            console.error('Headers not properly initialized');
            showMessage('Lỗi cấu trúc dữ liệu', 'error');
            return;
        }

        // Lọc các cột được chọn hiển thị
        const visibleHeaders = currentHeaders.filter(header => 
            columnVisibility[header] !== false
        );

        // Tạo HTML cho bảng
        let html = `
            <table>
                <thead>
                    <tr>
                        <th>STT</th>
                        ${visibleHeaders.map(header => `
                            <th class="sortable" data-column="${header}">
                                ${header}
                                <span class="sort-icon ${
                                    currentSortColumn === header ? currentSortDirection : ''
                                }"></span>
                            </th>
                        `).join('')}
                        <th>Số lượng thực tế</th>
                    </tr>
                </thead>
                <tbody>
        `;

        // Thêm dữ liệu vào bảng
        tableData.forEach((item, index) => {
            html += `
                <tr data-id="${item.id}">
                    <td>${index + 1}</td>
                    ${visibleHeaders.map(header => `
                        <td>${item[header] || ''}</td>
                    `).join('')}
                    <td>
                        <input type="number" 
                               class="quantity-input" 
                               value="${item.actualQuantity || ''}"
                               onchange="updateQuantity('${item.id}', this.value)">
                    </td>
                </tr>
            `;
        });

        html += '</tbody></table>';
        tableContainer.innerHTML = html;

        // Thêm event listeners cho sorting
        document.querySelectorAll('th.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.column;
                sortTable(column);
            });
        });

    } catch (error) {
        console.error('Error rendering table:', error);
        showMessage('Lỗi khi hiển thị bảng dữ liệu', 'error');
    }
}

// Thêm danh mục mới vào Firebase
async function addCategory() {
    try {
        const nameInput = document.getElementById('newCategoryName');
        const descInput = document.getElementById('newCategoryDesc');

        if (!nameInput || !descInput) {
            throw new Error('Form inputs not found');
        }

        const name = nameInput.value.trim();
        const description = descInput.value.trim();

        if (!name) {
            showMessage('Vui lòng nhập tên danh mục', 'error');
            nameInput.focus();
            return;
        }

        // Kiểm tra trùng tên
        const snapshot = await categoriesRef.where('name', '==', name).get();
        if (!snapshot.empty) {
            showMessage('Tên danh mục đã tồn tại', 'error');
            nameInput.focus();
            return;
        }

        // Thêm vào Firestore
        await categoriesRef.add({
            name: name,
            description: description,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: currentRole
        });

        // Đóng modal thêm danh mục
        closeModal('addCategoryModal');

        // Làm mới danh sách trong modal quản lý
        await refreshCategoriesList();

        // Reset form
        nameInput.value = '';
        descInput.value = '';

        showMessage('Đã thêm danh mục mới thành công', 'success');

    } catch (error) {
        console.error('Error adding category:', error);
        showMessage('Lỗi khi thêm danh mục mới', 'error');
    }
}

async function refreshCategoriesList() {
    try {
        const listContainer = document.getElementById('categoriesList');
        if (!listContainer) return;

        const snapshot = await categoriesRef.get();
        listContainer.innerHTML = '';

        if (snapshot.empty) {
            listContainer.innerHTML = '<p class="no-data">Chưa có danh mục nào</p>';
            return;
        }

        snapshot.forEach(doc => {
            const category = { id: doc.id, ...doc.data() };
            const categoryDiv = createCategoryListItem(category);
            listContainer.appendChild(categoryDiv);
        });

        // Cập nhật danh sách chính
        loadCategories();

    } catch (error) {
        console.error('Error refreshing categories list:', error);
        showMessage('Lỗi khi cập nhật danh sách danh mục', 'error');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hide');
    }
}

function showMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    messageDiv.textContent = message;

    // Style cho message
    Object.assign(messageDiv.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 25px',
        borderRadius: '5px',
        backgroundColor: type === 'error' ? '#f44336' :
            type === 'success' ? '#4CAF50' : '#2196F3',
        color: 'white',
        zIndex: '9999',
        animation: 'fadeIn 0.5s, fadeOut 0.5s 2.5s'
    });

    document.body.appendChild(messageDiv);

    // Xóa message sau 3 giây
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Thêm CSS animation cho message
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-20px); }
    }
`;
document.head.appendChild(style);

const additionalStyles = `
    .quantity-input.saved {
        background-color: #e8f5e9;
        transition: background-color 0.3s;
    }

    table th {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 200px;
    }

    table td {
        max-width: 200px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }
`;

// Thêm styles mới
const additionalStyleSheet = document.createElement('style');
additionalStyleSheet.textContent = additionalStyles;
document.head.appendChild(additionalStyleSheet);

const modalStyles = `
.modal {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5);
    justify-content: center;
    align-items: center;
    z-index: 1000;
}

.modal.show {
    display: flex;
}

.modal-content {
    background-color: white;
    padding: 30px;
    border-radius: 10px;
    min-width: 400px;
    max-width: 90%;
}

.category-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border-bottom: 1px solid #ddd;
}

.category-info h4 {
    margin: 0 0 5px 0;
}

.category-actions {
    display: flex;
    gap: 10px;
}

.edit-btn, .delete-btn {
    padding: 11px 20px;
    border-radius: 8px;
    cursor: pointer;
}

.edit-btn {
    background-color: #2196F3;
    color: white;
}

.delete-btn {
    background-color: #f44336;
    color: white;
}
`;
const styleSheet = document.createElement('style');
styleSheet.textContent = modalStyles;
document.head.appendChild(styleSheet);


const editModalStyles = `
    #editCategoryModal.modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        justify-content: center;
        align-items: center;
        z-index: 1001;
    }

    #editCategoryModal .modal-content {
        background-color: white;
        padding: 30px;
        border-radius: 10px;
        min-width: 400px;
        max-width: 90%;
        position: relative;
    }

    #editCategoryModal .form-group {
        margin-bottom: 15px;
    }

    #editCategoryModal label {
        display: block;
        margin-bottom: 5px;
        font-weight: bold;
    }

    #editCategoryModal input,
    #editCategoryModal textarea {
        width: 100%;
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
    }

    #editCategoryModal textarea {
        height: 100px;
        resize: vertical;
    }

    #editCategoryModal .modal-buttons {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
    }
`;

// Thêm styles vào head
const editStyleSheet = document.createElement('style');
editStyleSheet.textContent = editModalStyles;
document.head.appendChild(editStyleSheet);


const inventoryStyles = `
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
    }

    .loading-content {
        background-color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
    }

    .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 10px;
    }

    @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
    }

    table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
    }

    th, td {
        padding: 12px;
        text-align: left;
        border: 1px solid #ddd;
    }

    th {
        background-color: #f5f5f5;
        font-weight: bold;
        cursor: pointer;
    }

    th:hover {
        background-color: #e9ecef;
    }

    .quantity-input {
        width: 100px;
        padding: 5px;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    .quantity-input:focus {
        border-color: #2196F3;
        outline: none;
    }

    .sortable {
        position: relative;
    }

    .sort-icon {
        display: inline-block;
        width: 0;
        height: 0;
        margin-left: 5px;
        vertical-align: middle;
    }

    .sort-icon.asc::after {
        content: '▲';
    }

    .sort-icon.desc::after {
        content: '▼';
    }
`;

// Thêm styles vào head
const inventoryStyleSheet = document.createElement('style');
inventoryStyleSheet.textContent = inventoryStyles;
document.head.appendChild(inventoryStyleSheet);

const columnVisibilityStyles = `
    .checkbox-container {
        display: flex;
        align-items: center;
        margin-bottom: 10px;
        cursor: pointer;
    }

    .checkbox-container input[type="checkbox"] {
        margin-right: 10px;
        width: 18px;
        height: 18px;
    }

    .checkbox-label {
        font-size: 14px;
    }

    #columnCheckboxes {
        max-height: 300px;
        overflow-y: auto;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        margin: 10px 0;
    }

    #columnVisibilityModal .modal-content {
        width: 400px;
        max-width: 90%;
    }

    #columnVisibilityModal h3 {
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #ddd;
    }
`;

// Thêm styles
const columnVisibilityStyleSheet = document.createElement('style');
columnVisibilityStyleSheet.textContent = columnVisibilityStyles;
document.head.appendChild(columnVisibilityStyleSheet);

const sortingStyles = `
    .sortable {
        cursor: pointer;
        position: relative;
        padding-right: 20px;
    }

    .sort-icon {
        position: absolute;
        right: 5px;
        top: 50%;
        transform: translateY(-50%);
        width: 0;
        height: 0;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
    }

    .sort-icon.asc::after {
        content: '▲';
        position: absolute;
        color: #2196F3;
    }

    .sort-icon.desc::after {
        content: '▼';
        position: absolute;
        color: #2196F3;
    }

    th:hover {
        background-color: #e9ecef;
    }
`;

// Thêm styles
const sortingStyleSheet = document.createElement('style');
sortingStyleSheet.textContent = sortingStyles;
document.head.appendChild(sortingStyleSheet);

const exportStyles = `
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 9999;
    }

    .loading-content {
        background: white;
        padding: 20px;
        border-radius: 8px;
        text-align: center;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .loading-content p {
        margin: 10px 0 0;
        color: #666;
    }

    @keyframes spin {
        100% { transform: rotate(360deg); }
    }

    .loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
    }
`;

// Thêm styles
const exportStyleSheet = document.createElement('style');
exportStyleSheet.textContent = exportStyles;
document.head.appendChild(exportStyleSheet);

async function exportToExcel() {
    try {
        if (!tableData || tableData.length === 0) {
            showMessage('Không có dữ liệu để xuất', 'error');
            return;
        }

        showLoading('Đang tạo file Excel...');

        // Lấy các cột đang hiển thị
        const visibleHeaders = currentHeaders.filter(header => 
            columnVisibility[header] !== false
        );

        // Tạo dữ liệu cho file Excel
        const excelData = tableData.map((item, index) => {
            const row = {
                'STT': index + 1
            };

            // Thêm dữ liệu cho các cột đang hiển thị
            visibleHeaders.forEach(header => {
                row[header] = item[header] || '';
            });

            // Thêm số lượng thực tế
            row['Số lượng thực tế'] = item.actualQuantity || '';

            return row;
        });

        // Tạo workbook mới
        const wb = XLSX.utils.book_new();
        
        // Tạo worksheet từ dữ liệu
        const ws = XLSX.utils.json_to_sheet(excelData, {
            header: ['STT', ...visibleHeaders, 'Số lượng thực tế']
        });

        // Điều chỉnh độ rộng cột
        const columnWidths = {};
        ['STT', ...visibleHeaders, 'Số lượng thực tế'].forEach(header => {
            columnWidths[header] = { wch: Math.max(header.length, 10) };
        });
        ws['!cols'] = Object.values(columnWidths);

        // Thêm style cho header
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let C = range.s.c; C <= range.e.c; C++) {
            const address = XLSX.utils.encode_cell({ r: 0, c: C });
            ws[address].s = {
                font: { bold: true },
                alignment: { horizontal: 'center' },
                fill: { fgColor: { rgb: "CCCCCC" } }
            };
        }

        // Thêm worksheet vào workbook
        XLSX.utils.book_append_sheet(wb, ws, 'Kiểm kê');

        // Tạo tên file với timestamp
        const timestamp = new Date().toISOString().replace(/[:\-]|\.\d{3}/g, '');
        const fileName = `kiem_ke_${currentCategory?.name || 'data'}_${timestamp}.xlsx`;

        // Xuất file
        XLSX.writeFile(wb, fileName);

        hideLoading();
        showMessage('Đã xuất Excel thành công', 'success');

    } catch (error) {
        hideLoading();
        console.error('Error exporting to Excel:', error);
        showMessage('Lỗi khi xuất Excel', 'error');
    }
}

// Xóa danh mục

function validateFile(input) {
    try {
        const file = input.files[0];
        if (!file) return;

        const fileName = file.name.toLowerCase();
        const validExtensions = ['.xlsx', '.xls'];
        const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

        if (!isValidExtension) {
            showMessage('Vui lòng chọn file Excel (.xlsx hoặc .xls)', 'error');
            input.value = ''; // Reset input
            return false;
        }

        // Kiểm tra kích thước file (ví dụ: giới hạn 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            showMessage('File không được vượt quá 5MB', 'error');
            input.value = '';
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error validating file:', error);
        showMessage('Lỗi khi kiểm tra file', 'error');
        return false;
    }
}

async function deleteCategory(categoryId) {
    try {
        if (!confirm('Bạn có chắc chắn muốn xóa danh mục này?')) {
            return;
        }

        // Xóa danh mục và dữ liệu liên quan
        await db.runTransaction(async (transaction) => {
            // Xóa danh mục
            transaction.delete(categoriesRef.doc(categoryId));

            // Xóa tất cả dữ liệu kiểm kê của danh mục
            const inventorySnapshot = await inventoryRef
                .where('categoryId', '==', categoryId)
                .get();
            
            inventorySnapshot.forEach(doc => {
                transaction.delete(doc.ref);
            });
        });

        // Cập nhật UI
        await refreshCategoriesList();
        showMessage('Đã xóa danh mục thành công', 'success');

    } catch (error) {
        console.error('Error in deleteCategory:', error);
        showMessage('Lỗi khi xóa danh mục', 'error');
    }
}

// Tải dữ liệu kiểm kê theo danh mục
async function loadInventoryData(categoryId) {
    try {
        const snapshot = await inventoryRef
            .where('categoryId', '==', categoryId)
            .get();

        tableData = [];
        let headers = [];

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.headers && data.headers.length > 0) {
                headers = data.headers;
            }
            tableData.push({
                id: doc.id,
                ...data.data,
                actualQuantity: data.actualQuantity
            });
        });

        // Lưu headers vào state
        currentHeaders = headers;

        renderTable(headers);
    } catch (error) {
        console.error('Error loading inventory data:', error);
        showMessage('Lỗi khi tải dữ liệu kiểm kê', 'error');
    }
}

// Xử lý tải file Excel
async function loadExcel() {
    try {
        const fileInput = document.getElementById('fileInput');
        const file = fileInput.files[0];

        if (!file) {
            showMessage('Vui lòng chọn file Excel', 'error');
            return;
        }

        if (!validateFile(fileInput)) {
            return;
        }

        showLoading('Đang tải dữ liệu...');

        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

                // Lấy các headers từ Excel theo thứ tự
                const range = XLSX.utils.decode_range(firstSheet['!ref']);
                const headers = [];
                for(let C = range.s.c; C <= range.e.c; C++) {
                    const cell = firstSheet[XLSX.utils.encode_cell({r: 0, c: C})];
                    headers.push(cell ? cell.v : '');
                }

                // Lưu headers vào state
                currentHeaders = headers;

                // Chuyển đổi dữ liệu theo headers
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, {
                    header: headers,
                    range: 1 // Bắt đầu từ dòng sau header
                });

                if (jsonData.length === 0) {
                    hideLoading();
                    showMessage('File Excel không có dữ liệu', 'error');
                    return;
                }

                // Xóa dữ liệu cũ
                const snapshot = await inventoryRef
                    .where('categoryId', '==', currentCategory.id)
                    .get();

                const batch = db.batch();
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });

                // Cập nhật thời gian cho danh mục
        batch.update(categoriesRef.doc(currentCategory.id), {
            lastUploadTime: firebase.firestore.FieldValue.serverTimestamp()
        });

                // Thêm dữ liệu mới với cấu trúc cột
                jsonData.forEach(item => {
                    const docRef = inventoryRef.doc();
                    const formattedItem = {
                        categoryId: currentCategory.id,
                        headers: headers, // Lưu thứ tự cột
                        data: {}, // Dữ liệu theo từng cột
                        actualQuantity: 0, // Số lượng thực tế
                        uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    // Lưu dữ liệu theo đúng cột
                    headers.forEach(header => {
                        formattedItem.data[header] = item[header] || '';
                    });

                    batch.set(docRef, formattedItem);
                });

                await batch.commit();
                hideLoading();
                showMessage('Đã tải dữ liệu Excel thành công', 'success');
                 await loadCategories();
                await loadInventoryData(currentCategory.id);

            } catch (error) {
                hideLoading();
                console.error('Error processing Excel file:', error);
                showMessage('Lỗi khi xử lý file Excel', 'error');
            }
        };

        reader.onerror = function() {
            hideLoading();
            showMessage('Lỗi khi đọc file', 'error');
        };

        reader.readAsArrayBuffer(file);

    } catch (error) {
        hideLoading();
        console.error('Error loading Excel:', error);
        showMessage('Lỗi khi tải file Excel', 'error');
    }
}


function showLoading(message = 'Đang xử lý...') {
    const loadingHtml = `
        <div class="loading-overlay">
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', loadingHtml);
}

function hideLoading() {
    const overlay = document.querySelector('.loading-overlay');
    if (overlay) {
        overlay.remove();
    }
}

function formatDate(date) {
    const d = new Date(date);
    const pad = (n) => n < 10 ? '0' + n : n;
    
    return `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}_${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function removeAccents(str) {
    return str.normalize('NFD')
             .replace(/[\u0300-\u036f]/g, '')
             .replace(/đ/g, 'd')
             .replace(/Đ/g, 'D');
}

function createValidFileName(name) {
    return removeAccents(name)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
}

// Lưu dữ liệu vào Firebase
async function saveData() {
    try {
        const batch = db.batch();
        let updateCount = 0;

        tableData.forEach(item => {
            if (item.id) {
                const docRef = inventoryRef.doc(item.id);
                batch.update(docRef, {
                    ...item,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                updateCount++;
            }
        });

        if (updateCount === 0) {
            showMessage('Không có thay đổi để lưu', 'info');
            return;
        }

        await batch.commit();
        showMessage('Đã lưu dữ liệu thành công', 'success');
        loadInventoryData(currentCategory.id);

    } catch (error) {
        console.error('Lỗi lưu dữ liệu:', error);
        showMessage('Lỗi khi lưu dữ liệu', 'error');
    }
}

// Xóa dữ liệu
async function clearData() {
    try {
        if (!confirm('Bạn có chắc chắn muốn xóa tất cả dữ liệu của danh mục này?')) {
            return;
        }

        const snapshot = await inventoryRef
            .where('categoryId', '==', currentCategory.id)
            .get();

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        showMessage('Đã xóa dữ liệu thành công', 'success');
        tableData = [];
        renderTable();

    } catch (error) {
        console.error('Lỗi xóa dữ liệu:', error);
        showMessage('Lỗi khi xóa dữ liệu', 'error');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    const addCategoryForm = document.getElementById('addCategoryForm');
    if (addCategoryForm) {
        addCategoryForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            await addCategory();
        });
    }
});

function renderTable(headers) {
    currentHeaders = headers;
    // Khởi tạo columnVisibility nếu chưa có
    headers.forEach(header => {
        if (columnVisibility[header] === undefined) {
            columnVisibility[header] = true;
        }
    });
    renderTableWithVisibility();
}

async function updateQuantity(itemId, value) {
    try {
        const quantity = parseFloat(value) || 0;
        
        // Cập nhật trong Firestore
        await inventoryRef.doc(itemId).update({
            actualQuantity: quantity,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Cập nhật dữ liệu local
        const item = tableData.find(item => item.id === itemId);
        if (item) {
            item.actualQuantity = quantity;
        }

        // Hiển thị visual feedback
        const input = document.querySelector(`tr[data-id="${itemId}"] input`);
        if (input) {
            input.classList.add('saved');
            setTimeout(() => input.classList.remove('saved'), 2000);
        }

    } catch (error) {
        console.error('Error updating quantity:', error);
        showMessage('Lỗi khi cập nhật số lượng', 'error');
    }
}
let currentHeaders = [];
function sortTable(column) {
    try {
        console.log('Sorting by column:', column);

        // Đảo chiều sắp xếp nếu click vào cùng một cột
        if (currentSortColumn === column) {
            currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            currentSortColumn = column;
            currentSortDirection = 'asc';
        }

        // Sắp xếp dữ liệu
        tableData.sort((a, b) => {
            let valueA = a[column];
            let valueB = b[column];

            // Xử lý giá trị null/undefined
            valueA = valueA === null || valueA === undefined ? '' : valueA;
            valueB = valueB === null || valueB === undefined ? '' : valueB;

            // Chuyển đổi sang số nếu có thể
            if (!isNaN(valueA) && !isNaN(valueB)) {
                valueA = parseFloat(valueA);
                valueB = parseFloat(valueB);
            } else {
                valueA = String(valueA).toLowerCase();
                valueB = String(valueB).toLowerCase();
            }

            if (currentSortDirection === 'asc') {
                return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
            } else {
                return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
            }
        });

        // Render lại bảng với dữ liệu đã sắp xếp
        renderTableWithVisibility();
        
        // Cập nhật biểu tượng sắp xếp
        updateSortIcons(column);

    } catch (error) {
        console.error('Error sorting table:', error);
        showMessage('Lỗi khi sắp xếp dữ liệu', 'error');
    }
}

function updateSortIcons(sortedColumn) {
    try {
        const headers = document.querySelectorAll('th.sortable');
        headers.forEach(header => {
            const icon = header.querySelector('.sort-icon');
            const column = header.dataset.column;

            // Xóa class cũ
            icon.classList.remove('asc', 'desc');

            // Thêm class mới nếu là cột đang sắp xếp
            if (column === sortedColumn) {
                icon.classList.add(currentSortDirection);
            }
        });
    } catch (error) {
        console.error('Error updating sort icons:', error);
    }
}

async function initializeApp() {
    try {
        // Hiển thị màn hình chọn vai trò
        const roleScreen = document.getElementById('roleScreen');
        if (roleScreen) {
            roleScreen.classList.remove('hide');
        }

        // Thêm event listeners cho các nút vai trò
        const roleButtons = document.querySelectorAll('.role-button');
        roleButtons.forEach(button => {
            button.addEventListener('click', () => {
                const role = button.classList.contains('admin-btn') ? 'admin' : 'inventory';
                selectRole(role);
            });
        });

        // Thêm event listeners cho các nút quản lý danh mục
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', showAddCategoryModal);
        }

        const manageCategoriesBtn = document.getElementById('manageCategoriesBtn');
        if (manageCategoriesBtn) {
            manageCategoriesBtn.addEventListener('click', showManageCategoriesModal);
        }

        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        showMessage('Lỗi khởi tạo ứng dụng', 'error');
    }
}

function showAddCategoryModal() {
    try {
        const modal = document.getElementById('addCategoryModal');
        if (!modal) {
            throw new Error('Modal not found');
        }

        // Reset form
        const form = document.getElementById('addCategoryForm');
        if (form) {
            form.reset();
        }

        // Hiển thị modal
        modal.style.display = 'flex';
        modal.classList.remove('hide');

        // Focus vào input tên
        const nameInput = document.getElementById('newCategoryName');
        if (nameInput) {
            nameInput.focus();
        }

    } catch (error) {
        console.error('Error showing add category modal:', error);
        showMessage('Lỗi khi mở form thêm danh mục', 'error');
    }
}

async function showManageCategoriesModal() {
    try {
        console.log('Opening manage categories modal');
        const modal = document.getElementById('manageCategoriesModal');
        const listContainer = document.getElementById('categoriesList');

        if (!modal || !listContainer) {
            throw new Error('Manage categories modal elements not found');
        }

        // Lấy danh sách danh mục từ Firestore
        const snapshot = await categoriesRef.get();
        
        // Xóa nội dung cũ
        listContainer.innerHTML = '';

        if (snapshot.empty) {
            listContainer.innerHTML = '<p class="no-data">Chưa có danh mục nào</p>';
        } else {
            snapshot.forEach(doc => {
                const category = { id: doc.id, ...doc.data() };
                const categoryDiv = createCategoryListItem(category);
                listContainer.appendChild(categoryDiv);
            });
        }

        // Hiển thị modal
        modal.style.display = 'flex';
        modal.classList.remove('hide');

    } catch (error) {
        console.error('Error showing manage categories modal:', error);
        showMessage('Lỗi khi mở quản lý danh mục', 'error');
    }
}

// Tạo element cho item trong danh sách danh mục
function createCategoryListItem(category) {
    const div = document.createElement('div');
    div.className = 'category-item';
    
    const createdAt = category.createdAt ? 
        new Date(category.createdAt.seconds * 1000).toLocaleString() : 
        'N/A';
    
    div.innerHTML = `
        <div class="category-info">
            <h4>${category.name}</h4>
            <p>${category.description || 'Không có mô tả'}</p>
            <small>Ngày tạo: ${createdAt}</small>
        </div>
        <div class="category-actions">
            <button onclick="editCategory('${category.id}')" class="btn edit-btn">
                <i class="fas fa-edit"></i> Sửa
            </button>
            <button onclick="deleteCategory('${category.id}')" class="btn delete-btn">
                <i class="fas fa-trash"></i> Xóa
            </button>
        </div>
    `;
    
    return div;
}

async function editCategory(categoryId) {
    try {
        console.log('Editing category:', categoryId);
        
        // Lấy dữ liệu danh mục từ Firestore
        const doc = await categoriesRef.doc(categoryId).get();
        if (!doc.exists) {
            showMessage('Không tìm thấy danh mục', 'error');
            return;
        }

        const category = { id: doc.id, ...doc.data() };

        // Tạo và hiển thị modal chỉnh sửa
        const modalHtml = `
            <div id="editCategoryModal" class="modal">
                <div class="modal-content">
                    <h3>Chỉnh Sửa Danh Mục</h3>
                    <form id="editCategoryForm">
                        <input type="hidden" id="editCategoryId" value="${category.id}">
                        <div class="form-group">
                            <label for="editCategoryName">Tên danh mục:</label>
                            <input type="text" id="editCategoryName" value="${category.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="editCategoryDesc">Mô tả:</label>
                            <textarea id="editCategoryDesc">${category.description || ''}</textarea>
                        </div>
                        <div class="modal-buttons">
                            <button type="submit" class="btn admin-btn">
                                <i class="fas fa-save"></i> Lưu
                            </button>
                            <button type="button" onclick="closeEditModal()" class="btn cancel-btn">
                                <i class="fas fa-times"></i> Hủy
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        // Thêm modal vào DOM
        let editModal = document.getElementById('editCategoryModal');
        if (editModal) {
            editModal.remove();
        }
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Lấy reference đến modal mới
        editModal = document.getElementById('editCategoryModal');
        const editForm = document.getElementById('editCategoryForm');

        // Thêm event listener cho form
        editForm.addEventListener('submit', handleEditSubmit);

        // Hiển thị modal
        editModal.style.display = 'flex';

    } catch (error) {
        console.error('Error in editCategory:', error);
        showMessage('Lỗi khi mở form chỉnh sửa', 'error');
    }
}

async function handleEditSubmit(event) {
    event.preventDefault();
    
    try {
        const categoryId = document.getElementById('editCategoryId').value;
        const name = document.getElementById('editCategoryName').value.trim();
        const description = document.getElementById('editCategoryDesc').value.trim();

        if (!name) {
            showMessage('Vui lòng nhập tên danh mục', 'error');
            return;
        }

        // Kiểm tra trùng tên với các danh mục khác
        const snapshot = await categoriesRef
            .where('name', '==', name)
            .get();

        const existingCategory = snapshot.docs.find(doc => doc.id !== categoryId);
        if (existingCategory) {
            showMessage('Tên danh mục đã tồn tại', 'error');
            return;
        }

        // Cập nhật trong Firestore
        await categoriesRef.doc(categoryId).update({
            name,
            description,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Đóng modal
        closeEditModal();

        // Cập nhật UI
        await refreshCategoriesList();
        showMessage('Đã cập nhật danh mục thành công', 'success');

    } catch (error) {
        console.error('Error in handleEditSubmit:', error);
        showMessage('Lỗi khi cập nhật danh mục', 'error');
    }
}

// Đóng modal chỉnh sửa
function closeEditModal() {
    const modal = document.getElementById('editCategoryModal');
    if (modal) {
        modal.remove();
    }
}

function selectRole(role) {
    try {
        console.log('Selecting role:', role);
        currentRole = role;

        // Ẩn màn hình chọn vai trò
        document.getElementById('roleScreen').classList.add('hide');

        // Hiển thị màn hình danh mục
        const categoryScreen = document.getElementById('categoryScreen');
        if (categoryScreen) {
            categoryScreen.classList.remove('hide');
        }

        // Cập nhật hiển thị vai trò
        const userRoleElement = document.querySelector('.user-role');
        if (userRoleElement) {
            userRoleElement.textContent = role === 'admin' ? 'Quản trị viên' : 'Kiểm kê viên';
        }

        // Hiển thị/ẩn controls admin
        const adminControls = document.getElementById('categoryAdminControls');
        if (adminControls) {
            adminControls.classList.toggle('hide', role !== 'admin');
        }

        // Tải danh sách danh mục
        loadCategories();

        console.log('Role selection completed:', role);
    } catch (error) {
        console.error('Error selecting role:', error);
        showMessage('Lỗi khi chọn vai trò', 'error');
    }
}
