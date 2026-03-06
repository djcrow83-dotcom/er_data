        
        
        
        

        // --- 1. CONSTANTS ---
        const LIVE_COLLECTION_NAME = 'er_data';
        const ARCHIVE_COLLECTION_NAME = 'er_status_archive_shared_v1';
        let currentCollectionName = LIVE_COLLECTION_NAME;
        const COLLECTION_NAME = LIVE_COLLECTION_NAME;
        const LOG_COLLECTION_NAME = 'er_status_logs_shared_v1';
        const SETTINGS_COLLECTION_NAME = 'er_settings_shared_v1';
        const USERS_COLLECTION_NAME = 'er_users_v60';

        const COLUMNS = [
            { id: '_date', label: 'E/R팀입고', width: '120px' }, { id: '_customer', label: '고객명', width: '80px' },
            { id: '_user_id', label: '아이디', width: '90px' }, { id: '_phone', label: '전화번호', width: '110px' },
            { id: '_courier', label: '배송사', width: '80px' },
            { id: '_tracking', label: '송장번호', width: '120px' },
            { id: '_order_date', label: '주문일', width: '110px' },
            { id: '_ship_date', label: '출고일', width: '110px' },
            { id: '_delivery_completed_date', label: '배송완료일', width: '100px' },
            { id: '_channel', label: '판매처', width: '100px' }, { id: '_order_id', label: '주문번호', width: '140px' },
            { id: '_product', label: '상품명', width: '240px' }, { id: '_product_price', label: '상품금액', width: '90px', align: 'right' },
            { id: '_discount_info', label: '할인내용', width: '120px' }, { id: '_discount_amount', label: '할인금액', width: '90px', align: 'right' },
            { id: '_payment_amount', label: '결제금액', width: '90px', align: 'right' }, { id: '_shipping_cost_paid', label: '배송비금액', width: '90px', align: 'right' },
            { id: '_refund_amount', label: '환불액', width: '90px', align: 'right' }, { id: '_refund_method', label: '환불수단', width: '100px' },
            { id: '_refund_ledger', label: '환불장', width: '80px' }, { id: '_product_condition', label: '제품상태', width: '100px' },
            { id: '_type', label: '구분', width: '70px' }, { id: '_reason', label: '사유', width: '120px' },
            { id: '_shipping', label: '배송비', width: '80px' }, { id: '_processingNote', label: '처리 특이사항', width: '150px' },
            { id: '_status', label: '처리상태', width: '100px' }, { id: '_pic', label: '처리자', width: '80px' }
        ];
        const FIELD_LABELS = { '_status': '처리상태', '_pic': '처리자', '_product': '상품명', '_reason': '사유', '_shipping': '배송비', '_processingNote': '처리메모', '_refund_amount': '환불액', '_payment_amount': '결제금액', '_product_condition': '제품상태', '_tracking': '송장번호', '_channel': '판매처' };

        // --- 2. STATE ---
        let app, auth, db, analytics;
        let standardData = [], selectedIds = new Set(), unsavedChanges = new Map();
        let currentUserName = localStorage.getItem('er_system_username') || 'Guest';
        let activeStatus = '', activeDate = '', activeReason = '', activeType = '', isFilteringUrgent = false, deleteTargetIds = [], searchTimeout;
        let currentChartPeriod = 'daily', dateRangeMode = 'all', dateRangeFrom = null, dateRangeTo = null;
        let columnFilters = {}, columnSortField = '', columnSortOrder = '', activeCombinedRowId = null, activeColumnFilter = null;
        window.currentTableData = [];
        let globalOptions = { reasons: [], shipping: [], conditions: [], channels: [] };
        let activeSettingsTab = 'reasons', isArchiveMode = false;
        let activeReasonRowId = null;
        let unsubscribeSettings = null, unsubscribeData = null;
        let isEditing = false, pendingSync = false, syncTimeout = null;

        let dataFetchMode = 'recent'; // 'recent' 또는 'all'

