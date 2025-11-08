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
let isAdminAuthenticated = false;
let pastedDataCache = {
    headers: [],
    rows: []
};

// Collections reference
const categoriesRef = db.collection('categories');
const inventoryRef = db.collection('inventory');
const ADMIN_PASSWORD = "71270";

// Tải danh sách danh mục từ Firebase
async function loadCategories() {
    try {

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

function showAdminPasswordModal() {
    const modal = document.getElementById('adminPasswordModal');
    const passwordInput = document.getElementById('adminPassword');
    
    if (!modal || !passwordInput) {
        console.error('Admin password modal not found');
        return;
    }

    // Reset form
    passwordInput.value = '';
    
    // Xóa error message nếu có
    const errorMsg = modal.querySelector('.password-error');
    if (errorMsg) {
        errorMsg.remove();
    }

    // Hiển thị modal
    modal.style.display = 'flex';
    modal.classList.remove('hide');
    
    // Focus vào input
    setTimeout(() => passwordInput.focus(), 100);
}

async function handleAdminPasswordSubmit(event) {
    event.preventDefault();
    
    const passwordInput = document.getElementById('adminPassword');
    const password = passwordInput.value;
    const modal = document.getElementById('adminPasswordModal');

    // Xóa error message cũ
    let errorMsg = modal.querySelector('.password-error');
    if (errorMsg) {
        errorMsg.remove();
    }

    // Kiểm tra mật khẩu
    if (password === ADMIN_PASSWORD) {
        isAdminAuthenticated = true;
        closeModal('adminPasswordModal');
        
        // Tiếp tục với quy trình chọn vai trò admin
        proceedWithAdminRole();
        
        showMessage('Đăng nhập thành công', 'success');
    } else {
        // Hiển thị lỗi
        errorMsg = document.createElement('small');
        errorMsg.className = 'password-error show';
        errorMsg.textContent = 'Mật khẩu không chính xác';
        
        const formGroup = passwordInput.closest('.form-group');
        formGroup.appendChild(errorMsg);
        
        // Làm rỗng input và focus lại
        passwordInput.value = '';
        passwordInput.focus();
        
        // Thêm hiệu ứng shake
        modal.querySelector('.modal-content').style.animation = 'shake 0.5s';
        setTimeout(() => {
            modal.querySelector('.modal-content').style.animation = '';
        }, 500);
    }
}

function cancelAdminLogin() {
    closeModal('adminPasswordModal');
    isAdminAuthenticated = false;
}

function proceedWithAdminRole() {
    try {
        currentRole = 'admin';
        document.body.classList.add('role-admin'); // Thêm class cho body
        document.body.classList.remove('role-inventory');

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
            userRoleElement.textContent = 'Quản trị viên';
        }

        // Hiển thị controls admin trên màn hình danh mục
        const categoryAdminControls = document.getElementById('categoryAdminControls');
        if (categoryAdminControls) {
            categoryAdminControls.classList.remove('hide');
        }

        // Tải danh sách danh mục
        loadCategories();

    } catch (error) {
        console.error('Error proceeding with admin role:', error);
        showMessage('Lỗi khi truy cập chức năng quản trị', 'error');
    }
}

async function selectCategory(category) {
    try {
        currentCategory = category;

        // Ẩn màn hình danh mục
        document.getElementById('categoryScreen').classList.add('hide');
        
        // Hiển thị màn hình kiểm kê
        const mainScreen = document.getElementById('mainScreen');
        mainScreen.classList.remove('hide');

        // Cập nhật tiêu đề
        document.getElementById('screenTitle').textContent = `${category.name}`;

        // Hiển thị container điều khiển chính
        const mainControls = document.getElementById('mainControls');
        if (mainControls) {
            mainControls.classList.remove('hide');
        }

        // Tải dữ liệu kiểm kê
        await loadInventoryData(category.id);

    } catch (error) {
        console.error('Error selecting category:', error);
        showMessage('Lỗi khi chọn danh mục', 'error');
    }
}

async function backToRoleSelection() {
    try {
        // Reset các biến state
        currentRole = null;
        currentCategory = null;
        tableData = [];
        currentHeaders = [];
        columnVisibility = {};
        currentSortColumn = null;
        currentSortDirection = 'asc';
        isAdminAuthenticated = false;
         cleanupListeners();

        // Ẩn màn hình danh mục
        document.getElementById('categoryScreen').classList.add('hide');
        document.getElementById('mainScreen').classList.add('hide');

        // Hiện màn hình chọn vai trò
        document.getElementById('roleScreen').classList.remove('hide');

        // Reset các container
        const tableContainer = document.getElementById('tableContainer');
        if (tableContainer) {
            tableContainer.innerHTML = '';
        }

        const categoryButtons = document.getElementById('categoryButtons');
        if (categoryButtons) {
            categoryButtons.innerHTML = '';
        }

        // Đóng tất cả modal đang mở
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.classList.add('hide');
        });

    } catch (error) {
        console.error('Error returning to role selection:', error);
        await Dialog.error('Lỗi khi quay lại màn hình chọn vai trò');
    }
}


// Dialog System
const Dialog = {
    modal: null,
    init() {
        this.modal = document.getElementById('dialogModal');
    },

    show(options) {
        if (!this.modal) this.init();
        
        const {
            title = '',
            message = '',
            type = 'info', // 'info', 'success', 'warning', 'error'
            buttons = []
        } = options;

        // Set title and message
        this.modal.querySelector('.dialog-title').textContent = title;
        
        // Set icon and message
        const iconClass = {
            info: 'fa-info-circle',
            success: 'fa-check-circle',
            warning: 'fa-exclamation-triangle',
            error: 'fa-times-circle'
        };

        this.modal.querySelector('.dialog-body').innerHTML = `
            <div class="dialog-type-${type}">
                <i class="fas ${iconClass[type]} dialog-icon"></i>
                <div>${message}</div>
            </div>
        `;

        // Set buttons
        const footer = this.modal.querySelector('.dialog-footer');
        footer.innerHTML = buttons.map(btn => `
            <button class="dialog-btn ${btn.class || 'dialog-btn-secondary'}" 
                    onclick="Dialog.handleButton(${btn.value})">
                ${btn.text}
            </button>
        `).join('');

        // Show modal
        this.modal.classList.remove('hide');
        this.modal.classList.add('show');

        // Return promise
        return new Promise((resolve) => {
            this.resolve = resolve;
        });
    },

    handleButton(value) {
        this.close();
        if (this.resolve) this.resolve(value);
    },

    close() {
        if (!this.modal) return;
        this.modal.classList.remove('show');
        this.modal.classList.add('hide');
    },

    // Predefined dialogs
    alert(message, title = 'Thông báo') {
        return this.show({
            title,
            message,
            type: 'info',
            buttons: [
                { text: 'OK', class: 'dialog-btn-primary', value: true }
            ]
        });
    },

    confirm(message, title = 'Xác nhận') {
        return this.show({
            title,
            message,
            type: 'warning',
            buttons: [
                { text: 'Hủy', class: 'dialog-btn-secondary', value: false },
                { text: 'Đồng ý', class: 'dialog-btn-primary', value: true }
            ]
        });
    },

    success(message, title = 'Thành công') {
        return this.show({
            title,
            message,
            type: 'success',
            buttons: [
                { text: 'OK', class: 'dialog-btn-primary', value: true }
            ]
        });
    },

    error(message, title = 'Lỗi') {
        return this.show({
            title,
            message,
            type: 'error',
            buttons: [
                { text: 'OK', class: 'dialog-btn-primary', value: true }
            ]
        });
    }
};

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

        // Đóng menu nếu đang mở
        const screenMenu = document.getElementById('screenMenu');
        const screenTitleBtn = document.getElementById('screenTitleBtn');
        if (screenMenu && screenTitleBtn) {
            screenMenu.classList.remove('show');
            screenTitleBtn.classList.remove('active');
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

        // Empty state khi chưa có dữ liệu
        if (!tableData || !Array.isArray(tableData) || tableData.length === 0 || 
            !currentHeaders || !Array.isArray(currentHeaders) || currentHeaders.length === 0) {
            
            tableContainer.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-inbox"></i>
                    </div>
                    <h3>Chưa có dữ liệu</h3>
                    <p>Hãy tải dữ liệu từ file Excel hoặc paste trực tiếp từ Excel</p>
                    <div class="empty-actions">
                        <button onclick="document.getElementById('fileInput').click()" class="btn btn-primary">
                            <i class="fas fa-file-upload"></i>
                            Tải file Excel
                        </button>
                        <button onclick="showPasteDataModal()" class="btn btn-outline">
                            <i class="fas fa-paste"></i>
                            Paste dữ liệu
                        </button>
                    </div>
                </div>
            `;
            
            // Ẩn stats
            updateDataStats();
            return;
        }

        // Lọc các cột được chọn hiển thị
        const visibleHeaders = currentHeaders.filter(header => 
            columnVisibility[header] !== false
        );

        // Tạo HTML cho bảng
        // Tạo HTML cho bảng
let html = `
    <table>
        <thead>
            <tr>
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
            ${visibleHeaders.map(header => `
                <td>${item[header] || ''}</td>
            `).join('')}
            <td>
                <input type="text" 
                       class="quantity-input" 
                       value="${item.actualQuantity !== undefined && item.actualQuantity !== null ? item.actualQuantity : 0}"
                       placeholder="0"
                       onfocus="if(this.value === '0') this.value = '';"
                       onblur="handleQuantityBlur(this, '${item.id}')"
                       onkeypress="return handleQuantityKeypress(event)">
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

// Cập nhật stats
updateDataStats();

// Kiểm tra và tô màu tất cả input
setTimeout(() => {
    checkAllQuantities();
}, 100);

    } catch (error) {
        console.error('Error rendering table:', error);
        showMessage('Lỗi khi hiển thị bảng dữ liệu', 'error');
    }
}

// Hàm xử lý khi nhấn phím trong input
function handleQuantityKeypress(event) {
    // Cho phép: số, dấu cách, +, -, *, /, ., (, )
    const allowedChars = /[\d\s\+\-\*\/\.\(\)]/;
    const key = event.key;
    
    // Cho phép các phím điều khiển (Enter, Backspace, Delete, Arrow keys, Tab)
    if (event.keyCode === 13) { // Enter
        event.target.blur(); // Trigger blur để tính toán
        return false;
    }
    
    if (event.keyCode === 8 || event.keyCode === 46 || event.keyCode === 9 || 
        (event.keyCode >= 37 && event.keyCode <= 40)) {
        return true;
    }
    
    // Kiểm tra ký tự được phép
    if (!allowedChars.test(key)) {
        event.preventDefault();
        return false;
    }
    
    return true;
}


// Hàm mới: Cập nhật thống kê dữ liệu
function updateDataStats() {
    const dataStats = document.getElementById('dataStats');
    const totalRowsEl = document.getElementById('totalRows');

    if (dataStats && totalRowsEl) {
        if (tableData && tableData.length > 0) {
            totalRowsEl.textContent = tableData.length;
            dataStats.classList.remove('hide');
        } else {
            dataStats.classList.add('hide');
        }
    }
}

// Biến toàn cục để lưu listener
let categoryListener = null;
let lastNotificationTime = 0;

// Hàm thiết lập listener cho category
function setupCategoryListener() {
    // Hủy listener cũ nếu có
    if (categoryListener) {
        categoryListener();
    }

    // Lắng nghe tất cả categories
    categoryListener = categoriesRef.onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
                const categoryData = change.doc.data();
                
                // Kiểm tra xem có thông báo lưu mới không
                if (categoryData.lastSaveNotification) {
                    const notification = categoryData.lastSaveNotification;
                    const notifTime = notification.timestamp?.seconds || 0;
                    
                    // Chỉ hiển thị thông báo nếu:
                    // 1. Thông báo mới hơn lần hiển thị trước
                    // 2. Không phải là category đang mở (để tránh duplicate)
                    // 3. Thông báo không quá 5 giây
                    const now = Date.now() / 1000;
                    if (notifTime > lastNotificationTime && 
                        (now - notifTime) < 5 &&
                        (!currentCategory || currentCategory.id !== change.doc.id)) {
                        
                        lastNotificationTime = notifTime;
                        
                        // Hiển thị thông báo
                        showSaveNotification(
                            notification.categoryName,
                            notification.itemCount
                        );
                    }
                }
            }
        });
    }, (error) => {
        console.error('Error listening to categories:', error);
    });
}

// Hàm phát âm thanh thông báo
function playNotificationSound() {
    try {
        // Âm thanh notification đơn giản dạng base64 (beep sound)
        const audioBase64 = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZURMPU6nm77BdGAg+ltryxnYpBSuBzvLZiTYIGGS56+mjUhALUKvj8LRgGwc5kdXxx3ElBSR1yPDekEAKE12z6eum...'; // Rút gọn
        
        const audio = new Audio(audioBase64);
        audio.volume = 0.4;
        audio.play().catch(err => console.log('Audio blocked:', err));
    } catch (error) {
        console.log('Audio not supported:', error);
    }
}

// Hàm hiển thị thông báo save từ user khác
function showSaveNotification(categoryName, itemCount) {
    // Phát âm thanh thông báo
    playNotificationSound();
    
    const notificationDiv = document.createElement('div');
    notificationDiv.className = 'save-notification';
    notificationDiv.innerHTML = `
        <div class="notification-icon">
            <i class="fas fa-save"></i>
        </div>
        <div class="notification-content">
            <strong>${categoryName}</strong>
            <span>Đã lưu ${itemCount} dòng dữ liệu</span>
        </div>
    `;

    document.body.appendChild(notificationDiv);

    // Tự động xóa sau 4 giây
    setTimeout(() => {
        notificationDiv.classList.add('fade-out');
        setTimeout(() => {
            notificationDiv.remove();
        }, 300);
    }, 4000);
}

// Hàm cleanup khi thoát
function cleanupListeners() {
    if (categoryListener) {
        categoryListener();
        categoryListener = null;
    }
}

// Hàm tính toán biểu thức số học
function evaluateExpression(expression) {
    try {
        // Loại bỏ khoảng trắng
        expression = expression.trim();
        
        // Nếu là số thuần túy thì trả về luôn
        if (/^\d+(\.\d+)?$/.test(expression)) {
            return parseFloat(expression);
        }
        
        // Kiểm tra biểu thức chỉ chứa số và các phép toán cho phép
        if (!/^[\d\s\+\-\*\/\.\(\)]+$/.test(expression)) {
            return null;
        }
        
        // Tính toán biểu thức (sử dụng Function constructor an toàn hơn eval)
        const result = Function('"use strict"; return (' + expression + ')')();
        
        // Kiểm tra kết quả hợp lệ
        if (isNaN(result) || !isFinite(result)) {
            return null;
        }
        
        // Làm tròn đến 2 chữ số thập phân
        return Math.round(result * 100) / 100;
        
    } catch (error) {
        console.log('Invalid expression:', expression);
        return null;
    }
}

// Hàm xử lý khi input mất focus
function handleQuantityBlur(input, itemId) {
    const value = input.value.trim();
    
    // Nếu trống, gán về 0
    if (value === '') {
        input.value = 0;
        updateQuantity(itemId, 0);
        checkAndHighlightQuantity(input, itemId);
        return;
    }
    
    // Thử tính toán biểu thức
    const calculatedValue = evaluateExpression(value);
    
    if (calculatedValue !== null) {
        // Nếu tính toán thành công
        const finalValue = Math.max(0, calculatedValue); // Không cho phép số âm
        input.value = finalValue;
        updateQuantity(itemId, finalValue);
        checkAndHighlightQuantity(input, itemId);
    } else {
        // Nếu biểu thức không hợp lệ, thử parse số
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            const finalValue = Math.max(0, numValue);
            input.value = finalValue;
            updateQuantity(itemId, finalValue);
            checkAndHighlightQuantity(input, itemId);
        } else {
            // Không hợp lệ, reset về 0
            input.value = 0;
            updateQuantity(itemId, 0);
            checkAndHighlightQuantity(input, itemId);
            showMessage('Biểu thức không hợp lệ, đã reset về 0', 'warning');
        }
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

function showPasteDataModal() {
    try {
        const modal = document.getElementById('pasteDataModal');
        const pasteArea = document.getElementById('pasteArea');
        document.addEventListener('keydown', handlePasteModalKeyboard);
        
        if (!modal || !pasteArea) {
            throw new Error('Paste modal elements not found');
        }

        // Reset modal
        clearPasteArea();

        // Hiển thị modal
        modal.style.display = 'flex';
        modal.classList.remove('hide');

        // Focus vào textarea
        setTimeout(() => pasteArea.focus(), 100);

        // Thêm event listener cho paste
        pasteArea.addEventListener('paste', handlePasteEvent);
        pasteArea.addEventListener('input', handlePasteInput);

    } catch (error) {
        console.error('Error showing paste modal:', error);
        showMessage('Lỗi khi mở form paste dữ liệu', 'error');
    }
}

function handlePasteModalKeyboard(e) {
    const modal = document.getElementById('pasteDataModal');
    if (!modal || modal.classList.contains('hide')) return;

    // ESC để đóng
    if (e.key === 'Escape') {
        closeModal('pasteDataModal');
    }

    // Ctrl+Enter để xác nhận
    if (e.ctrlKey && e.key === 'Enter') {
        const confirmBtn = document.getElementById('confirmPasteBtn');
        if (confirmBtn && !confirmBtn.disabled) {
            processPastedData();
        }
    }
}

const originalCloseModalUpdated = closeModal;
closeModal = function(modalId) {
    if (modalId === 'pasteDataModal') {
        document.removeEventListener('keydown', handlePasteModalKeyboard);
    }
    originalCloseModalUpdated(modalId);
};

function handlePasteEvent(e) {
    e.preventDefault();
    
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    const pasteArea = document.getElementById('pasteArea');
    
    if (pastedText) {
        pasteArea.value = pastedText;
        pasteArea.classList.add('has-data');
        
        // Parse và hiển thị preview
        parseAndPreviewData(pastedText);
    }
}

// Hàm xử lý input thủ công
function handlePasteInput(e) {
    const pasteArea = e.target;
    const text = pasteArea.value;

    if (text.trim()) {
        pasteArea.classList.add('has-data');
        parseAndPreviewData(text);
    } else {
        clearPasteArea();
    }
}

// Hàm parse và preview dữ liệu
function parseAndPreviewData(text) {
    try {
        // Clean dữ liệu
        text = cleanPastedData(text);

        if (!text) {
            showPasteError('Không có dữ liệu để xử lý');
            return;
        }

        // Tách thành các dòng
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length === 0) {
            showPasteError('Không có dữ liệu để xử lý');
            return;
        }

        if (lines.length < 2) {
            showPasteError('Cần ít nhất 2 dòng (1 dòng header + 1 dòng dữ liệu)');
            return;
        }

        // Phát hiện delimiter
        const delimiter = detectDelimiter(lines);
        console.log('Detected delimiter:', delimiter === '\t' ? 'TAB' : delimiter);

        // Parse header
        const headers = delimiter === '\t' 
            ? parseLineByTab(lines[0])
            : parseLineByDelimiter(lines[0], delimiter);

        // Lọc bỏ header rỗng
        const validHeaders = headers.filter(h => h.trim());

        if (validHeaders.length === 0) {
            showPasteError('Không tìm thấy tiêu đề cột hợp lệ');
            return;
        }

        console.log('Headers found:', validHeaders);

        // Parse các dòng dữ liệu
        const rows = [];
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // Bỏ qua dòng trống
            if (!line) continue;

            // Parse cells
            const cells = delimiter === '\t'
                ? parseLineByTab(line)
                : parseLineByDelimiter(line, delimiter);

            // Tạo object từ cells
            const row = {};
            let hasData = false;

            validHeaders.forEach((header, index) => {
                const cellValue = (cells[index] || '').trim();
                row[header] = cellValue;
                if (cellValue) hasData = true;
            });

            // Chỉ thêm dòng có dữ liệu
            if (hasData) {
                rows.push(row);
            }
        }

        // Kiểm tra có dữ liệu không
        if (rows.length === 0) {
            showPasteError('Không có dữ liệu sau dòng tiêu đề');
            return;
        }

        console.log('Parsed rows:', rows.length);

        // Lưu vào cache
        pastedDataCache = {
            headers: validHeaders,
            rows: rows
        };

        // Hiển thị thống kê
        updatePasteStats(validHeaders.length, rows.length);

        // Hiển thị preview
        showDataPreview(validHeaders, rows);

        // Enable nút xác nhận
        document.getElementById('confirmPasteBtn').disabled = false;
        document.getElementById('clearPasteBtn').disabled = false;

        // Hiệu ứng thành công
        const pasteArea = document.getElementById('pasteArea');
        pasteArea.classList.add('success');
        setTimeout(() => pasteArea.classList.remove('success'), 500);

    } catch (error) {
        console.error('Error parsing pasted data:', error);
        showPasteError('Lỗi khi phân tích dữ liệu. Vui lòng kiểm tra định dạng.');
    }
}

// Hàm cập nhật thống kê
function updatePasteStats(columnCount, rowCount) {
    const stats = document.getElementById('pasteStats');
    const columnCountEl = document.getElementById('columnCount');
    const rowCountEl = document.getElementById('rowCount');

    if (stats && columnCountEl && rowCountEl) {
        columnCountEl.textContent = columnCount;
        rowCountEl.textContent = rowCount;
        stats.classList.remove('hide');
    }
}

// Hàm hiển thị preview dữ liệu
function showDataPreview(headers, rows) {
    const previewContainer = document.getElementById('previewContainer');
    const previewTable = document.getElementById('previewTable');

    if (!previewContainer || !previewTable) return;

    // Tạo header
    let html = '<thead><tr>';
    html += '<th class="row-number">#</th>';
    headers.forEach(header => {
        html += `<th>${escapeHtml(header)}</th>`;
    });
    html += '</tr></thead>';

    // Tạo body (hiển thị tối đa 10 dòng đầu)
    html += '<tbody>';
    const previewRows = rows.slice(0, 10);
    previewRows.forEach((row, index) => {
        html += '<tr>';
        html += `<td class="row-number">${index + 1}</td>`;
        headers.forEach(header => {
            html += `<td>${escapeHtml(row[header] || '')}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody>';

    if (rows.length > 10) {
        html += '<tfoot><tr><td colspan="' + (headers.length + 1) + '" style="text-align: center; color: #666; font-style: italic;">... và ' + (rows.length - 10) + ' dòng nữa</td></tr></tfoot>';
    }

    previewTable.innerHTML = html;
    previewContainer.classList.remove('hide');
}

// Hàm escape HTML để tránh XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Hàm hiển thị lỗi paste
function showPasteError(message) {
    const previewContainer = document.getElementById('previewContainer');
    
    const errorHtml = `
        <div class="paste-error">
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
        </div>
    `;

    previewContainer.innerHTML = errorHtml;
    previewContainer.classList.remove('hide');

    // Disable nút xác nhận
    document.getElementById('confirmPasteBtn').disabled = true;
}

// Hàm xóa paste area
function clearPasteArea() {
    const pasteArea = document.getElementById('pasteArea');
    const previewContainer = document.getElementById('previewContainer');
    const pasteStats = document.getElementById('pasteStats');
    const confirmBtn = document.getElementById('confirmPasteBtn');
    const clearBtn = document.getElementById('clearPasteBtn');

    if (pasteArea) {
        pasteArea.value = '';
        pasteArea.classList.remove('has-data', 'success');
    }

    if (previewContainer) {
        previewContainer.classList.add('hide');
        previewContainer.innerHTML = '';
    }

    if (pasteStats) {
        pasteStats.classList.add('hide');
    }

    if (confirmBtn) {
        confirmBtn.disabled = true;
    }

    if (clearBtn) {
        clearBtn.disabled = true;
    }

    // Reset cache
    pastedDataCache = {
        headers: [],
        rows: []
    };
}

// Hàm xử lý dữ liệu đã paste
async function processPastedData() {
    try {
        if (!pastedDataCache.headers.length || !pastedDataCache.rows.length) {
            showMessage('Không có dữ liệu để xử lý', 'error');
            return;
        }

        // Xác nhận trước khi tải lên
        const confirmed = await Dialog.confirm(
            `Bạn có chắc muốn tải lên ${pastedDataCache.rows.length} dòng dữ liệu?`,
            'Xác nhận tải dữ liệu'
        );

        if (!confirmed) return;

        showLoading(`Đang tải ${pastedDataCache.rows.length} dòng dữ liệu...`);

        const { headers, rows } = pastedDataCache;

        // Lưu headers vào state
        currentHeaders = headers;

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

        // Thêm dữ liệu mới
        rows.forEach(row => {
            const docRef = inventoryRef.doc();
            const formattedItem = {
                categoryId: currentCategory.id,
                headers: headers,
                data: {},
                actualQuantity: 0,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            headers.forEach(header => {
                formattedItem.data[header] = row[header] || '';
            });

            batch.set(docRef, formattedItem);
        });

        await batch.commit();

// Đóng modal
closeModal('pasteDataModal');

// Tải lại dữ liệu
await loadCategories();
await loadInventoryData(currentCategory.id);

// Sắp xếp tự động theo cột đầu tiên
autoSortData();
renderTableWithVisibility();

hideLoading();

// Hiển thị thông báo thành công
await Dialog.success(
    `Đã tải thành công ${rows.length} dòng dữ liệu và sắp xếp A-Z`,
    'Thành công'
);

    } catch (error) {
        hideLoading();
        console.error('Error processing pasted data:', error);
        await Dialog.error('Lỗi khi tải dữ liệu lên hệ thống');
    }
}

function cleanPastedData(text) {
    // Normalize line breaks
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Xóa các dòng trống ở đầu và cuối
    text = text.trim();
    
    return text;
}

// Hàm phát hiện delimiter (tab, comma, etc.)
function detectDelimiter(lines) {
    // Ưu tiên tab trước vì Excel copy thường dùng tab
    const firstLine = lines[0];
    
    // Đếm số tab
    const tabCount = (firstLine.match(/\t/g) || []).length;
    
    if (tabCount > 0) {
        return '\t';
    }
    
    // Nếu không có tab, kiểm tra delimiter khác
    const delimiters = [',', ';', '|'];
    let maxCount = 0;
    let detectedDelimiter = ',';

    delimiters.forEach(delimiter => {
        const count = (firstLine.match(new RegExp('\\' + delimiter, 'g')) || []).length;
        if (count > maxCount) {
            maxCount = count;
            detectedDelimiter = delimiter;
        }
    });

    return maxCount > 0 ? detectedDelimiter : '\t';
}

function parseLineByTab(line) {
    return line.split('\t').map(cell => cell.trim());
}

function parseLineByDelimiter(line, delimiter) {
    // Xử lý trường hợp có quote
    const cells = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            cells.push(currentCell.trim());
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    
    // Thêm cell cuối cùng
    cells.push(currentCell.trim());
    
    return cells;
}

// Cập nhật hàm closeModal để cleanup event listeners
const originalCloseModal = closeModal;
closeModal = function(modalId) {
    if (modalId === 'pasteDataModal') {
        const pasteArea = document.getElementById('pasteArea');
        if (pasteArea) {
            pasteArea.removeEventListener('paste', handlePasteEvent);
            pasteArea.removeEventListener('input', handlePasteInput);
        }
        clearPasteArea();
    }
    originalCloseModal(modalId);
};

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
        // Tạo dữ liệu cho file Excel
const excelData = tableData.map((item, index) => {
    const row = {};

    // Thêm dữ liệu cho các cột đang hiển thị
    visibleHeaders.forEach(header => {
        row[header] = item[header] || '';
    });

    // Thêm số lượng thực tế - đảm bảo luôn hiển thị 0 nếu không có giá trị
    const actualQuantity = item.actualQuantity !== undefined && item.actualQuantity !== null 
        ? item.actualQuantity 
        : 0;
    row['Số lượng thực tế'] = actualQuantity;

    return row;
});

// Tạo workbook mới
const wb = XLSX.utils.book_new();

// Tạo worksheet từ dữ liệu
const ws = XLSX.utils.json_to_sheet(excelData, {
    header: [...visibleHeaders, 'Số lượng thực tế']
});

// Điều chỉnh độ rộng cột
const columnWidths = {};
[...visibleHeaders, 'Số lượng thực tế'].forEach(header => {
    columnWidths[header] = { wch: Math.max(header.length, 10) };
});
ws['!cols'] = Object.values(columnWidths);


        // Thêm style cho header
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let C = range.s.c; C <= range.e.c; C++) {
            const address = XLSX.utils.encode_cell({ r: 0, c: C });
            if (ws[address]) {
                ws[address].s = {
                    font: { bold: true },
                    alignment: { horizontal: 'center' },
                    fill: { fgColor: { rgb: "CCCCCC" } }
                };
            }
        }

        // Format số cho cột "Số lượng thực tế"
        const actualQtyColIndex = visibleHeaders.length; // STT + visibleHeaders + Số lượng thực tế
        for (let R = 1; R <= tableData.length; R++) {
            const cellAddress = XLSX.utils.encode_cell({ r: R, c: actualQtyColIndex });
            if (ws[cellAddress]) {
                ws[cellAddress].t = 'n'; // Đảm bảo kiểu số
                ws[cellAddress].z = '0'; // Format hiển thị số
            }
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

// Hàm sắp xếp dữ liệu theo cột đầu tiên (A-Z)
function autoSortData() {
    if (!tableData || tableData.length === 0 || !currentHeaders || currentHeaders.length === 0) {
        return;
    }

    const firstColumn = currentHeaders[0];
    
    tableData.sort((a, b) => {
        let valueA = a[firstColumn];
        let valueB = b[firstColumn];

        // Xử lý giá trị null/undefined
        valueA = valueA === null || valueA === undefined ? '' : valueA;
        valueB = valueB === null || valueB === undefined ? '' : valueB;

        // Chuyển đổi sang số nếu có thể
        const numA = parseFloat(valueA);
        const numB = parseFloat(valueB);

        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB; // Sắp xếp số từ nhỏ đến lớn
        } else {
            // Sắp xếp chuỗi A-Z (không phân biệt hoa thường)
            valueA = String(valueA).toLowerCase();
            valueB = String(valueB).toLowerCase();
            return valueA.localeCompare(valueB, 'vi');
        }
    });

    // Cập nhật trạng thái sắp xếp
    currentSortColumn = firstColumn;
    currentSortDirection = 'asc';
}

// Xóa danh mục

function validateFile(input) {
    try {
        const file = input.files[0];
        const fileInfo = document.getElementById('fileInfo');
        const uploadBtn = document.getElementById('uploadBtn');

        if (!file) {
            hideFileInfo();
            return false;
        }

        const fileName = file.name.toLowerCase();
        const validExtensions = ['.xlsx', '.xls'];
        const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

        // Kiểm tra định dạng file
        if (!isValidExtension) {
            showFileError('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
            input.value = '';
            hideFileInfo();
            return false;
        }

        // Kiểm tra kích thước file (giới hạn 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            showFileError('File không được vượt quá 10MB');
            input.value = '';
            hideFileInfo();
            return false;
        }

        // Hiển thị thông tin file
        showFileInfo(file);
        
        // Enable nút upload
        if (uploadBtn) {
            uploadBtn.disabled = false;
        }

        return true;

    } catch (error) {
        console.error('Error validating file:', error);
        showMessage('Lỗi khi kiểm tra file', 'error');
        return false;
    }
}

function hideFileInfo() {
    const fileInfo = document.getElementById('fileInfo');
    const uploadBtn = document.getElementById('uploadBtn');

    if (fileInfo) {
        fileInfo.classList.add('hide');
        fileInfo.classList.remove('valid', 'invalid');
    }

    if (uploadBtn) {
        uploadBtn.disabled = true;
    }
}

function showFileError(message) {
    const fileInfo = document.getElementById('fileInfo');
    if (!fileInfo) return;

    const fileName = fileInfo.querySelector('.file-name');
    const fileSize = fileInfo.querySelector('.file-size');

    if (fileName && fileSize) {
        fileName.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        fileSize.textContent = '';
    }

    fileInfo.classList.remove('hide', 'valid');
    fileInfo.classList.add('invalid');
    
    showMessage(message, 'error');
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function clearFileSelection() {
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');

    if (fileInput) {
        fileInput.value = '';
    }

    hideFileInfo();

    if (uploadBtn) {
        uploadBtn.disabled = true;
    }

    showMessage('Đã xóa file đã chọn', 'info');
}

function showFileInfo(file) {
    const fileInfo = document.getElementById('fileInfo');
    if (!fileInfo) return;

    const fileName = fileInfo.querySelector('.file-name');
    const fileSize = fileInfo.querySelector('.file-size');

    if (fileName && fileSize) {
        fileName.textContent = file.name;
        fileSize.textContent = formatFileSize(file.size);
    }

    fileInfo.classList.remove('hide', 'invalid');
    fileInfo.classList.add('valid');
}

function toggleUserMenu() {
    const userInfo = document.querySelector('.user-info');
    const userMenu = document.querySelector('.user-menu');
    
    userInfo.classList.toggle('active');
    userMenu.classList.toggle('show');
}

// Đóng menu khi click ra ngoài
document.addEventListener('click', (e) => {
    const userInfo = document.querySelector('.user-info');
    const userMenu = document.querySelector('.user-menu');
    
    if (!userInfo.contains(e.target)) {
        userInfo.classList.remove('active');
        userMenu.classList.remove('show');
    }
});

async function deleteCategory(categoryId) {
    try {
        const confirmed = await Dialog.confirm(
            'Bạn có chắc chắn muốn xóa danh mục này?',
            'Xác nhận xóa'
        );

         if (!confirmed) return;
         
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
        await Dialog.success('Đã xóa danh mục thành công');

    } catch (error) {
        console.error('Error in deleteCategory:', error);
        await Dialog.error('Lỗi khi xóa danh mục');
    }
}

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

        // Sắp xếp tự động theo cột đầu tiên
        autoSortData();

        renderTable(headers);
    } catch (error) {
        console.error('Error loading inventory data:', error);
        showMessage('Lỗi khi tải dữ liệu kiểm kê', 'error');
    }
}

// Hàm sắp xếp thủ công
function manualSort() {
    if (!tableData || tableData.length === 0) {
        showMessage('Không có dữ liệu để sắp xếp', 'info');
        return;
    }

    autoSortData();
    renderTableWithVisibility();
    showMessage('Đã sắp xếp dữ liệu theo A-Z', 'success');
}

// Hàm kiểm tra và tô màu input (có tooltip)
function checkAndHighlightQuantity(input, itemId) {
    const item = tableData.find(item => item.id === itemId);
    if (!item) return;

    const actualQuantity = parseFloat(input.value) || 0;
    
    // Lấy cột cuối cùng của dữ liệu (cột trước cột "Số lượng thực tế")
    if (currentHeaders && currentHeaders.length > 0) {
        const lastDataColumn = currentHeaders[currentHeaders.length - 1];
        const expectedQuantity = parseFloat(item[lastDataColumn]) || 0;
        
        // So sánh và tô màu
        if (actualQuantity < expectedQuantity) {
            input.classList.add('warning');
            input.classList.remove('normal');
            input.title = `Thiếu: ${expectedQuantity - actualQuantity} (Yêu cầu: ${expectedQuantity})`;
        } else if (actualQuantity > expectedQuantity) {
            input.classList.add('normal');
            input.classList.remove('warning');
            input.title = `Dư: ${actualQuantity - expectedQuantity} (Yêu cầu: ${expectedQuantity})`;
        } else {
            input.classList.add('normal');
            input.classList.remove('warning');
            input.title = `Đủ: ${expectedQuantity}`;
        }
    }
}

// Hàm kiểm tra tất cả các input
function checkAllQuantities() {
    const inputs = document.querySelectorAll('.quantity-input');
    inputs.forEach(input => {
        const row = input.closest('tr');
        const itemId = row.dataset.id;
        if (itemId) {
            checkAndHighlightQuantity(input, itemId);
        }
    });
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
                    range: 1
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

                // Thêm dữ liệu mới
                jsonData.forEach(item => {
                    const docRef = inventoryRef.doc();
                    const formattedItem = {
                        categoryId: currentCategory.id,
                        headers: headers,
                        data: {},
                        actualQuantity: 0,
                        uploadedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    headers.forEach(header => {
                        formattedItem.data[header] = item[header] || '';
                    });

                    batch.set(docRef, formattedItem);
                });

                await batch.commit();

// Reset file selection sau khi upload thành công
clearFileSelection();

// Tải lại dữ liệu
await loadCategories();
await loadInventoryData(currentCategory.id);

// Sắp xếp tự động theo cột đầu tiên
autoSortData();
renderTableWithVisibility();

hideLoading();
showMessage(`Đã tải thành công ${jsonData.length} dòng dữ liệu và sắp xếp A-Z`, 'success');

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

async function saveData() {
    try {
        showLoading('Đang lưu dữ liệu...');
        
        const batch = db.batch();
        let updateCount = 0;

        // Lấy tất cả input
        const quantityInputs = document.querySelectorAll('.quantity-input');
        
        quantityInputs.forEach(input => {
            const value = input.value.trim();
            const row = input.closest('tr');
            const itemId = row.dataset.id;
            
            if (itemId) {
                // Chuyển đổi giá trị: rỗng hoặc không hợp lệ = 0
                const quantity = value === '' || value === null || value === undefined ? 0 : (parseFloat(value) || 0);
                
                const docRef = inventoryRef.doc(itemId);
                batch.update(docRef, {
                    actualQuantity: quantity,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                // Cập nhật dữ liệu local
                const item = tableData.find(item => item.id === itemId);
                if (item) {
                    item.actualQuantity = quantity;
                }
                
                updateCount++;
            }
        });

        if (updateCount === 0) {
            hideLoading();
            showMessage('Không có dữ liệu để lưu', 'info');
            return;
        }

        // Cập nhật thời gian lastUploadTime cho danh mục
        if (currentCategory && currentCategory.id) {
            batch.update(categoriesRef.doc(currentCategory.id), {
                lastUploadTime: firebase.firestore.FieldValue.serverTimestamp(),
                lastSaveNotification: {
                    categoryName: currentCategory.name,
                    itemCount: updateCount,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                }
            });
        }

        await batch.commit();
        hideLoading();
        showMessage(`Đã lưu ${updateCount} dòng dữ liệu thành công`, 'success');

        // Cập nhật danh mục
        loadCategories();

        // Kiểm tra lại màu sau khi lưu
        setTimeout(() => {
            checkAllQuantities();
        }, 200);

    } catch (error) {
        hideLoading();
        console.error('Lỗi lưu dữ liệu:', error);
        showMessage('Lỗi khi lưu dữ liệu', 'error');
    }
}


// Xóa dữ liệu
async function clearData() {
    try {
        const confirmed = await Dialog.confirm(
            'Bạn có chắc chắn muốn xóa tất cả dữ liệu này?',
            'Xác nhận xóa'
        );
         if (!confirmed) return;

        const snapshot = await inventoryRef
            .where('categoryId', '==', currentCategory.id)
            .get();

        const batch = db.batch();
        snapshot.forEach(doc => {
            batch.delete(doc.ref);
        });

        await batch.commit();
        await Dialog.success('Đã xóa dữ liệu thành công');
        tableData = [];
        currentHeaders = []; // Reset headers
        renderTableWithVisibility();

    } catch (error) {
        console.error('Lỗi xóa dữ liệu:', error);
         await Dialog.error('Lỗi khi xóa dữ liệu');
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

    // Thêm event listener cho user info button
    const userInfoBtn = document.getElementById('userInfoBtn');
    const userMenu = document.getElementById('userMenu');

    if (userInfoBtn && userMenu) {
        userInfoBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            userMenu.classList.toggle('show');
            userInfoBtn.classList.toggle('active');
        });

        // Đóng menu khi click ra ngoài
        document.addEventListener('click', function(e) {
            if (!userInfoBtn.contains(e.target)) {
                userMenu.classList.remove('show');
                userInfoBtn.classList.remove('active');
            }
        });

        // Ngăn việc đóng menu khi click vào menu items
        userMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    const screenTitleBtn = document.getElementById('screenTitleBtn');
    const screenMenu = document.getElementById('screenMenu');

    if (screenTitleBtn && screenMenu) {
        screenTitleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            screenMenu.classList.toggle('show');
            screenTitleBtn.classList.toggle('active');
        });

        // Đóng menu khi click ra ngoài
        document.addEventListener('click', function(e) {
            if (!screenTitleBtn.contains(e.target)) {
                screenMenu.classList.remove('show');
                screenTitleBtn.classList.remove('active');
            }
        });

        // Ngăn việc đóng menu khi click vào menu items
        screenMenu.addEventListener('click', function(e) {
            e.stopPropagation();
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
        // Chuyển đổi giá trị thành số, nếu rỗng hoặc không hợp lệ thì là 0
        const quantity = value === '' || value === null || value === undefined ? 0 : (parseFloat(value) || 0);
        
        // Cập nhật trong Firestore
        await inventoryRef.doc(itemId).update({
            actualQuantity: quantity,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Cập nhật dữ liệu local
        const item = tableData.find(item => item.id === itemId);
        if (item) {
            item.actualQuantity = quantity;
            
            // Log để debug (tùy chọn)
            if (currentHeaders && currentHeaders.length > 0) {
                const lastColumn = currentHeaders[currentHeaders.length - 1];
                const expected = item[lastColumn];
                console.log(`Item ${itemId}: Expected=${expected}, Actual=${quantity}`);
            }
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

        const adminPasswordForm = document.getElementById('adminPasswordForm');
        if (adminPasswordForm) {
            adminPasswordForm.addEventListener('submit', handleAdminPasswordSubmit);
        }
         setupCategoryListener();

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
        
        if (role === 'admin') {
            // Yêu cầu xác thực mật khẩu cho admin
            showAdminPasswordModal();
            return;
        }
        
        // Với vai trò inventory, tiếp tục như cũ
        currentRole = role;
        document.body.classList.add('role-inventory'); // Thêm class cho body
        document.body.classList.remove('role-admin');

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
            userRoleElement.textContent = 'Kiểm kê viên';
        }

        // Ẩn controls admin trên màn hình danh mục
        const categoryAdminControls = document.getElementById('categoryAdminControls');
        if (categoryAdminControls) {
            categoryAdminControls.classList.add('hide');
        }

        // Tải danh sách danh mục
        loadCategories();

    } catch (error) {
        console.error('Error selecting role:', error);
        showMessage('Lỗi khi chọn vai trò', 'error');
    }
}


