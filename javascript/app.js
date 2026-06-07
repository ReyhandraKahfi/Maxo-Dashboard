document.addEventListener('DOMContentLoaded', () => {
  
  let state = {
    currentPage: 'dashboard',
    productSort: { key: 'id', dir: 1 },
    productPage: 1, productPerPage: 6,
    customerPage: 1, customerPerPage: 6,
    trxPage: 1, trxPerPage: 7,
    deleteTarget: null, deleteCallback: null,
    editTarget: null, currentReport: 'revenue',
    charts: {}
  };

  window.state = state;
  
  function navigate(page) {
    const sections = document.querySelectorAll('.page-section');
    const navItems = document.querySelectorAll('.nav-item');
    const targetSection = document.getElementById('page-' + page);
    const targetNav = document.querySelector(`[data-page="${page}"]`);
    
    if (!targetSection || !targetNav) return;
    
    sections.forEach(s => s.classList.remove('active'));
    navItems.forEach(n => n.classList.remove('active'));
    targetSection.classList.add('active');
    targetNav.classList.add('active');
    
    const titleEl = document.getElementById('topbarTitle');
    if (titleEl) titleEl.textContent = page.charAt(0).toUpperCase() + page.slice(1);
    
    state.currentPage = page;
    closeSidebar();
    refreshPage(page);
  }

  function refreshPage(page) {
    if (page === 'dashboard') refreshDashboard();
    if (page === 'products') { 
      if (typeof renderProductsTable === 'function') renderProductsTable(); 
      if (typeof updateProductStats === 'function') updateProductStats();
    }
    if (page === 'customers') { 
      if (typeof renderCustomersTable === 'function') renderCustomersTable(); 
      if (typeof updateCustomerStats === 'function') updateCustomerStats();
    }
    if (page === 'transactions') { 
      if (typeof renderTransactionsTable === 'function') renderTransactionsTable(); 
      if (typeof updateTrxStats === 'function') updateTrxStats();
    }
    if (page === 'users') renderUsersTable();
    if (page === 'reports') generateReport(state.currentReport);
  }

  function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && overlay) {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('show');
    }
  }
  
  function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('show');
  }

  function toggleTheme() {
    const dark = document.documentElement.dataset.theme === 'dark';
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    const themeBtn = document.getElementById('themeBtn');
    const darkToggle = document.getElementById('darkModeToggle');
    if (themeBtn) themeBtn.textContent = dark ? '🌙' : '☀️';
    if (darkToggle) darkToggle.checked = !dark;
    if (typeof rebuildCharts === 'function') rebuildCharts();
  }
  
  function toggleThemeFromSettings(checkbox) {
    document.documentElement.dataset.theme = checkbox.checked ? 'dark' : 'light';
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) themeBtn.textContent = checkbox.checked ? '☀️' : '🌙';
    if (typeof rebuildCharts === 'function') rebuildCharts();
  }

  function fmtRp(n) {
    if (n >= 1e9) return 'Rp ' + (n/1e9).toFixed(1) + 'B';
    if (n >= 1e6) return 'Rp ' + (n/1e6).toFixed(0) + 'JT';
    return 'Rp ' + n.toLocaleString('id-ID');
  }
  
  function fmtRpFull(n) { return 'Rp ' + n.toLocaleString('id-ID'); }
  
  function fmtDate(d) { 
    return new Date(d).toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'}); 
  }

  function refreshDashboard() {
    setTimeout(() => {
      const skeleton = document.getElementById('kpiSkeleton');
      const cards = document.getElementById('kpiCards');
      if (skeleton) skeleton.style.display = 'none';
      if (cards) cards.style.display = '';
      if (typeof animateKPICards === 'function') animateKPICards();
      if (typeof buildCharts === 'function') buildCharts();
    }, 700);
    if (typeof renderRecentTrx === 'function') renderRecentTrx();
  }

  function animateKPICards() {
    if (typeof DB === 'undefined') {
      console.error('DB not loaded yet');
      return;
    }
    
    const revenue = DB.transactions.reduce((s,t) => s + t.total_price, 0);
    const lowStock = DB.products.filter(p => p.stock <= 5).length;
    const growth = 14.2;

    const cards = document.querySelectorAll('#kpiCards .kpi-card');
    cards.forEach((c, i) => {
      c.style.opacity = 0;
      c.style.transform = 'translateY(20px)';
      setTimeout(() => {
        c.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        c.style.opacity = 1; 
        c.style.transform = 'translateY(0)';
      }, 80 * i);
    });

    setTimeout(() => {
      animateCount('kpiRevenue', 0, revenue, 1200, fmtRp);
      animateCount('kpiTrx', 0, DB.transactions.length, 800, v => Math.round(v).toLocaleString());
      animateCount('kpiProducts', 0, DB.products.length, 800, v => Math.round(v).toLocaleString());
      animateCount('kpiCustomers', 0, DB.customers.length, 800, v => Math.round(v).toLocaleString());
      animateCount('kpiGrowth', 0, growth, 1000, v => v.toFixed(1) + '%');
      animateCount('kpiLowStock', 0, lowStock, 600, v => Math.round(v).toLocaleString());
    }, 300);
  }

  function animateCount(id, from, to, dur, fmt) {
    const el = document.getElementById(id); 
    if (!el) return;
    const start = performance.now();
    function step(now) {
      const p = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * ease);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function renderRecentTrx() {
    if (typeof DB === 'undefined') return;
    const tbody = document.getElementById('recentTrxBody');
    if (!tbody) return;
    const recent = [...DB.transactions].sort((a,b)=>b.id-a.id).slice(0,5);
    tbody.innerHTML = recent.map((t,i) => `
      <tr style="opacity:0; animation: fadeRow 0.3s ease ${i*60}ms forwards">
        <td><span style="font-family:var(--mono); font-size:12px">${t.transaction_code}</span></td>
        <td>${t.customer_name}</td>
        <td>${t.product_name}</td>
        <td><span class="badge badge-blue">${t.quantity}</span></td>
        <td style="font-weight:600">${fmtRp(t.total_price)}</td>
        <td style="color:var(--text3)">${fmtDate(t.transaction_date)}</td>
        <td><span class="badge badge-green">✓ Complete</span></td>
      </tr>
    `).join('');
  }

  const chartColors = {
    blue: '#1e6bf0', green: '#0f9d58', amber: '#c47c00', red: '#d93025', purple: '#6200ea',
    blueA: 'rgba(30,107,240,0.12)', greenA: 'rgba(15,157,88,0.12)'
  };

  function buildCharts() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded yet, retrying in 500ms');
      setTimeout(buildCharts, 500);
      return;
    }
    destroyCharts();
    buildRevenueChart();
    buildCategoryChart();
    buildSalesChart();
    buildTopProductsChart();
  }

  function destroyCharts() {
    Object.values(state.charts).forEach(c => { if(c && typeof c.destroy === 'function') c.destroy(); });
    state.charts = {};
  }

  function rebuildCharts() {
    if (state.currentPage === 'dashboard') setTimeout(buildCharts, 100);
  }

  function buildRevenueChart() {
    const months = ['Jan','Feb','Mar','Apr','May','Jun'];
    const data = [680,890,720,1100,960,1340];
    const ctx = document.getElementById('revenueChart');
    if (!ctx) return;
    state.charts.revenue = new Chart(ctx, {
      type: 'line',
      data: {
        labels: months,
        datasets: [{
          label: 'Revenue (Juta)', data,
          borderColor: chartColors.blue, borderWidth: 2.5,
          backgroundColor: chartColors.blueA,
          fill: true, tension: 0.45,
          pointBackgroundColor: chartColors.blue, pointRadius: 4, pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  function buildCategoryChart() {
    if (typeof DB === 'undefined') return;
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    const cats = {}; 
    DB.products.forEach(p => cats[p.category] = (cats[p.category]||0)+1);
    state.charts.category = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(cats), 
        datasets: [{
          data: Object.values(cats),
          backgroundColor: [chartColors.blue, chartColors.green, chartColors.amber, chartColors.purple],
          borderWidth: 2, borderColor: 'var(--surface)'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        cutout: '70%',
        plugins: { legend: { display: false } }
      }
    });
  }

  function buildSalesChart() {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;
    state.charts.sales = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['W1','W2','W3','W4','W5','W6'],
        datasets: [{
          label: 'Units', data: [4,7,5,9,6,8],
          backgroundColor: chartColors.green,
          borderRadius: 5, borderSkipped: false
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  function buildTopProductsChart() {
    if (typeof DB === 'undefined') return;
    const ctx = document.getElementById('topProductsChart');
    if (!ctx) return;
    const revenue = {};
    DB.transactions.forEach(t => revenue[t.product_name] = (revenue[t.product_name]||0) + t.total_price);
    const sorted = Object.entries(revenue).sort((a,b)=>b[1]-a[1]).slice(0,5);
    state.charts.topProducts = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sorted.map(([k])=>k.split(' ').slice(0,2).join(' ')),
        datasets: [{ label: 'Revenue', data: sorted.map(([,v])=>v/1e6), backgroundColor: chartColors.purple, borderRadius: 4 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }
    });
  }

  function setChartPeriod(el, period) {
    document.querySelectorAll('.chart-card .chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    const data = period === '3m' ? [960,1100,1340] : [680,890,720,1100,960,1340];
    const labels = period === '3m' ? ['Apr','May','Jun'] : ['Jan','Feb','Mar','Apr','May','Jun'];
    if (state.charts.revenue) {
      state.charts.revenue.data.labels = labels;
      state.charts.revenue.data.datasets[0].data = data;
      state.charts.revenue.update('active');
    }
  }

  //product table
  function getFilteredProducts() {
    if (typeof DB === 'undefined') return [];
    const q = (document.getElementById('productSearch')?.value || '').toLowerCase();
    const cat = document.getElementById('productCategoryFilter')?.value || '';
    return DB.products.filter(p =>
      (!q || p.product_name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)) &&
      (!cat || p.category === cat)
    );
  }

  function renderProductsTable() {
    if (typeof DB === 'undefined') return;
    const filtered = getFilteredProducts();
    const sorted = [...filtered].sort((a,b) => {
      const { key, dir } = state.productSort;
      if (a[key] < b[key]) return -dir; 
      if (a[key] > b[key]) return dir; 
      return 0;
    });
    const total = sorted.length;
    const start = (state.productPage - 1) * state.productPerPage;
    const page = sorted.slice(start, start + state.productPerPage);
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    tbody.innerHTML = page.map((p,i) => {
      const stockBadge = p.stock <= 5 ? `<span class="badge badge-red">⚠ ${p.stock}</span>` :
        p.stock <= 10 ? `<span class="badge badge-amber">${p.stock}</span>` :
        `<span class="badge badge-green">${p.stock}</span>`;
      return `<tr style="opacity:0; animation: fadeRow 0.25s ease ${i*40}ms forwards">
        <td><span style="font-family:var(--mono); font-size:12px; color:var(--text3)">#${p.id}</span></td>
        <td style="font-weight:500">${p.product_name}</td>
        <td><span class="badge badge-blue">${p.category}</span></td>
        <td>${stockBadge}</td>
        <td style="font-weight:600">${fmtRpFull(p.price)}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openEditProduct(${p.id})">✏</button>
          <button class="btn btn-danger btn-sm" onclick="openDelete('product',${p.id},'${p.product_name}')">🗑</button>
        </td>
      </tr>`;
    }).join('');
    renderPagination('product', total, state.productPage, state.productPerPage, 'productPagination', 'productPaginationInfo');
  }

  function updateProductStats() {
    if (typeof DB === 'undefined') return;
    const totalProducts = document.getElementById('statTotalProducts');
    const totalStock = document.getElementById('statTotalStock');
    const lowStock = document.getElementById('statLowStock');
    const catalogValue = document.getElementById('statCatalogValue');
    
    if (totalProducts) totalProducts.textContent = DB.products.length;
    if (totalStock) totalStock.textContent = DB.products.reduce((s,p)=>s+p.stock,0);
    if (lowStock) lowStock.textContent = DB.products.filter(p=>p.stock<=5).length;
    if (catalogValue) {
      const val = DB.products.reduce((s,p)=>s+p.price*p.stock,0);
      catalogValue.textContent = fmtRp(val);
    }
  }

  function sortTable(type, key) {
    if (type === 'products') {
      if (state.productSort.key === key) state.productSort.dir *= -1;
      else { state.productSort.key = key; state.productSort.dir = 1; }
      renderProductsTable();
    }
  }

  //customer table
  function renderCustomersTable() {
    if (typeof DB === 'undefined') return;
    const q = (document.getElementById('customerSearch')?.value || '').toLowerCase();
    const filtered = DB.customers.filter(c => !q ||
      c.customer_name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q)
    );
    const total = filtered.length;
    const start = (state.customerPage - 1) * state.customerPerPage;
    const page = filtered.slice(start, start + state.customerPerPage);
    const tbody = document.getElementById('customersTableBody');
    if (!tbody) return;
    tbody.innerHTML = page.map((c,i) => `
      <tr style="opacity:0; animation: fadeRow 0.25s ease ${i*40}ms forwards">
        <td><span style="font-family:var(--mono); font-size:12px; color:var(--text3)">#${c.id}</span></td>
        <td>
          <div style="display:flex; align-items:center; gap:8px">
            <div style="width:30px;height:30px;border-radius:50%;background:var(--accent-bg);color:var(--accent);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">${c.customer_name.split(' ').map(n=>n[0]).join('').slice(0,2)}</div>
            <span style="font-weight:500">${c.customer_name}</span>
          </div>
        </td>
        <td style="color:var(--text2)">${c.phone}</td>
        <td><a href="mailto:${c.email}" style="color:var(--accent);text-decoration:none">${c.email}</a></td>
        <td style="color:var(--text3)">${c.address}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openEditCustomer(${c.id})">✏</button>
          <button class="btn btn-danger btn-sm" onclick="openDelete('customer',${c.id},'${c.customer_name}')">🗑</button>
        </td>
      </tr>
    `).join('');
    renderPagination('customer', total, state.customerPage, state.customerPerPage, 'customerPagination', 'customerPaginationInfo');
  }

  function updateCustomerStats() {
    if (typeof DB === 'undefined') return;
    const total = document.getElementById('statTotalCustomers');
    if (total) total.textContent = DB.customers.length;
  }

  //transaction table
  function renderTransactionsTable() {
    if (typeof DB === 'undefined') return;
    const q = (document.getElementById('trxSearch')?.value || '').toLowerCase();
    const df = document.getElementById('trxDateFilter')?.value;
    const filtered = DB.transactions.filter(t =>
      (!q || t.transaction_code.toLowerCase().includes(q) || t.customer_name.toLowerCase().includes(q) || t.product_name.toLowerCase().includes(q)) &&
      (!df || t.transaction_date === df)
    );
    const total = filtered.length;
    const start = (state.trxPage - 1) * state.trxPerPage;
    const page = filtered.slice(start, start + state.trxPerPage);
    const tbody = document.getElementById('trxTableBody');
    if (!tbody) return;
    tbody.innerHTML = page.map((t,i) => `
      <tr style="opacity:0; animation: fadeRow 0.25s ease ${i*40}ms forwards">
        <td><span style="font-family:var(--mono); font-size:12px; color:var(--accent)">${t.transaction_code}</span></td>
        <td>${t.customer_name}</td>
        <td>${t.product_name}</td>
        <td><span class="badge badge-blue">${t.quantity}</span></td>
        <td style="font-weight:600">${fmtRpFull(t.total_price)}</td>
        <td style="color:var(--text3)">${fmtDate(t.transaction_date)}</td>
        <td>
          <button class="btn btn-danger btn-sm" onclick="openDelete('transaction',${t.id},'${t.transaction_code}')">🗑</button>
        </td>
      </tr>
    `).join('');
    renderPagination('trx', total, state.trxPage, state.trxPerPage, 'trxPagination', 'trxPaginationInfo');
  }

  function updateTrxStats() {
    if (typeof DB === 'undefined') return;
    const rev = DB.transactions.reduce((s,t)=>s+t.total_price,0);
    const total = document.getElementById('statTotalTrx');
    const revenue = document.getElementById('statTrxRevenue');
    const avg = document.getElementById('statAvgOrder');
    
    if (total) total.textContent = DB.transactions.length;
    if (revenue) revenue.textContent = fmtRp(rev);
    if (avg && DB.transactions.length) avg.textContent = fmtRp(rev / DB.transactions.length);
  }

  //users table
  function renderUsersTable() {
    if (typeof DB === 'undefined') return;
    const q = (document.getElementById('userSearch')?.value || '').toLowerCase();
    const filtered = DB.users.filter(u => !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    const roleBadge = { Admin: 'badge-purple', Manager: 'badge-blue', Staff: 'badge-amber' };
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    tbody.innerHTML = filtered.map((u,i) => `
      <tr style="opacity:0; animation: fadeRow 0.25s ease ${i*40}ms forwards">
        <td><span style="font-family:var(--mono); font-size:12px; color:var(--text3)">#${u.id}</span></td>
        <td style="font-weight:500">${u.name}</td>
        <td style="color:var(--text2)">${u.email}</td>
        <td><span class="badge ${roleBadge[u.role]||'badge-blue'}">${u.role}</span></td>
        <td><span class="badge ${u.status==='Active'?'badge-green':'badge-red'}">${u.status}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openEditUser(${u.id})">✏</button>
          <button class="btn btn-danger btn-sm" onclick="openDelete('user',${u.id},'${u.name}')">🗑</button>
        </td>
      </tr>
    `).join('');
  }

  //pages
  function renderPagination(type, total, current, perPage, paginId, infoId) {
    const pages = Math.ceil(total / perPage);
    const info = document.getElementById(infoId);
    const pagin = document.getElementById(paginId);
    const from = Math.min((current-1)*perPage+1, total);
    const to = Math.min(current*perPage, total);
    if(info) info.textContent = total ? `Showing ${from}–${to} of ${total} records` : 'No records';
    if(!pagin) return;
    let html = '';
    if(pages > 1) {
      html += `<button class="btn btn-secondary btn-sm" ${current===1?'disabled':''} onclick="changePage('${type}',${current-1})">‹</button>`;
      for(let p=1; p<=Math.min(pages,5); p++) {
        html += `<button class="btn btn-sm ${p===current?'btn-primary':'btn-secondary'}" onclick="changePage('${type}',${p})">${p}</button>`;
      }
      html += `<button class="btn btn-secondary btn-sm" ${current===pages?'disabled':''} onclick="changePage('${type}',${current+1})">›</button>`;
    }
    pagin.innerHTML = html;
  }

  function changePage(type, page) {
    if(type==='product') { state.productPage=page; renderProductsTable(); }
    if(type==='customer') { state.customerPage=page; renderCustomersTable(); }
    if(type==='trx') { state.trxPage=page; renderTransactionsTable(); }
  }

  //functions
  const MODAL_FORMS = {
    addProduct: {
      title: 'Add New Product',
      body: `<div class="form-row">
        <div class="form-group"><label class="form-label">Product Name</label><input class="form-input" id="f_name" placeholder="Toyota Avanza"></div>
        <div class="form-group"><label class="form-label">Category</label><select class="form-input" id="f_category"><option>MPV</option><option>City Car</option><option>SUV</option><option>Sedan</option><option>Pickup</option></select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Stock</label><input type="number" class="form-input" id="f_stock" placeholder="10" min="0"></div>
        <div class="form-group"><label class="form-label">Price (Rp)</label><input type="number" class="form-input" id="f_price" placeholder="250000000"></div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveProduct()">Save Product</button></div>`
    },
    addCustomer: {
      title: 'Add New Customer',
      body: `<div class="form-row">
        <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="f_cname" placeholder="Budi Santoso"></div>
        <div class="form-group"><label class="form-label">Phone</label><input class="form-input" id="f_phone" placeholder="08123456789"></div>
      </div>
      <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="f_email" placeholder="budi@email.com"></div>
      <div class="form-group"><label class="form-label">Address</label><textarea class="form-input" id="f_address" rows="2" placeholder="Jakarta Selatan"></textarea></div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveCustomer()">Save Customer</button></div>`
    },
    addTransaction: {
      title: 'New Transaction',
      body: `<div class="form-row">
        <div class="form-group"><label class="form-label">Customer</label><select class="form-input" id="f_tcust">${typeof DB !== 'undefined' ? DB.customers.map(c=>`<option>${c.customer_name}</option>`).join('') : ''}</select></div>
        <div class="form-group"><label class="form-label">Product</label><select class="form-input" id="f_tprod">${typeof DB !== 'undefined' ? DB.products.map(p=>`<option>${p.product_name}</option>`).join('') : ''}</select></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Quantity</label><input type="number" class="form-input" id="f_tqty" value="1" min="1"></div>
        <div class="form-group"><label class="form-label">Date</label><input type="date" class="form-input" id="f_tdate" value="${new Date().toISOString().split('T')[0]}"></div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveTransaction()">Record Transaction</button></div>`
    },
    addUser: {
      title: 'Add New User',
      body: `<div class="form-row">
        <div class="form-group"><label class="form-label">Full Name</label><input class="form-input" id="f_uname" placeholder="John Doe"></div>
        <div class="form-group"><label class="form-label">Email</label><input type="email" class="form-input" id="f_uemail" placeholder="user@company.com"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label class="form-label">Role</label><select class="form-input" id="f_urole"><option>Admin</option><option>Manager</option><option>Staff</option></select></div>
        <div class="form-group"><label class="form-label">Status</label><select class="form-input" id="f_ustatus"><option>Active</option><option>Inactive</option></select></div>
      </div>
      <div class="modal-footer"><button class="btn btn-secondary" onclick="closeModal()">Cancel</button><button class="btn btn-primary" onclick="saveUser()">Save User</button></div>`
    }
  };

  function openModal(type, data) {
    const m = MODAL_FORMS[type];
    if (!m) return;
    const titleEl = document.getElementById('modalTitle');
    const bodyEl = document.getElementById('modalBody');
    const overlay = document.getElementById('modalOverlay');
    
    if (titleEl) titleEl.textContent = m.title;
    if (bodyEl) bodyEl.innerHTML = m.body;
    if (data && typeof fillModalEdit === 'function') fillModalEdit(type, data);
    if (overlay) overlay.classList.add('open');
  }

  function closeModal() { 
    const overlay = document.getElementById('modalOverlay');
    if (overlay) overlay.classList.remove('open'); 
  }

  function fillModalEdit(type, data) {
    if (type === 'editProduct') {
      const f = document.getElementById('f_name'); if(f) f.value = data.product_name;
      const fc = document.getElementById('f_category'); if(fc) fc.value = data.category;
      const fs = document.getElementById('f_stock'); if(fs) fs.value = data.stock;
      const fp = document.getElementById('f_price'); if(fp) fp.value = data.price;
    }
  }

  //save functions
  function saveProduct() {
    if (typeof DB === 'undefined') return;
    const name = document.getElementById('f_name')?.value.trim();
    const cat = document.getElementById('f_category')?.value;
    const stock = parseInt(document.getElementById('f_stock')?.value) || 0;
    const price = parseInt(document.getElementById('f_price')?.value) || 0;
    if(!name) { showToast('error','Validation Error','Product name is required.'); return; }
    const id = state.editTarget || (DB.products.length + 1);
    if(state.editTarget) {
      const p = DB.products.find(p=>p.id===state.editTarget);
      if(p) { p.product_name=name; p.category=cat; p.stock=stock; p.price=price; }
      state.editTarget = null;
      showToast('success','Product Updated',`"${name}" has been updated.`);
    } else {
      DB.products.push({id, product_name:name, category:cat, stock, price});
      showToast('success','Product Added',`"${name}" added to catalog.`);
    }
    closeModal(); renderProductsTable(); updateProductStats();
  }

  function saveCustomer() {
    if (typeof DB === 'undefined') return;
    const name = document.getElementById('f_cname')?.value.trim();
    const phone = document.getElementById('f_phone')?.value.trim();
    const email = document.getElementById('f_email')?.value.trim();
    const address = document.getElementById('f_address')?.value.trim();
    if(!name) { showToast('error','Validation Error','Customer name is required.'); return; }
    if(state.editTarget) {
      const c = DB.customers.find(c=>c.id===state.editTarget);
      if(c) { c.customer_name=name; c.phone=phone; c.email=email; c.address=address; }
      state.editTarget = null;
      showToast('success','Customer Updated',`"${name}" updated.`);
    } else {
      DB.customers.push({id: DB.customers.length+1, customer_name:name, phone, email, address});
      showToast('success','Customer Added',`"${name}" has been added.`);
    }
    closeModal(); renderCustomersTable(); updateCustomerStats();
  }

  function saveTransaction() {
    if (typeof DB === 'undefined') return;
    const cust = document.getElementById('f_tcust')?.value;
    const prod = document.getElementById('f_tprod')?.value;
    const qty = parseInt(document.getElementById('f_tqty')?.value) || 1;
    const date = document.getElementById('f_tdate')?.value;
    const product = DB.products.find(p=>p.product_name===prod);
    const price = product ? product.price * qty : 0;
    const code = 'TRX' + String(DB.transactions.length+1).padStart(3,'0');
    DB.transactions.push({id:DB.transactions.length+1, transaction_code:code, customer_name:cust, product_name:prod, quantity:qty, total_price:price, transaction_date:date});
    showToast('success','Transaction Recorded',`${code} for ${fmtRp(price)}`);
    closeModal(); renderTransactionsTable(); updateTrxStats();
  }

  function saveUser() {
    if (typeof DB === 'undefined') return;
    const name = document.getElementById('f_uname')?.value.trim();
    const email = document.getElementById('f_uemail')?.value.trim();
    const role = document.getElementById('f_urole')?.value;
    const status = document.getElementById('f_ustatus')?.value;
    if(!name) { showToast('error','Validation Error','User name is required.'); return; }
    if(state.editTarget) {
      const u = DB.users.find(u=>u.id===state.editTarget);
      if(u) { u.name=name; u.email=email; u.role=role; u.status=status; }
      state.editTarget = null;
      showToast('success','User Updated',`${name} updated.`);
    } else {
      DB.users.push({id:DB.users.length+1, name, email, role, status});
      showToast('success','User Added',`${name} added.`);
    }
    closeModal(); renderUsersTable();
  }

  //edit openers
  function openEditProduct(id) {
    if (typeof DB === 'undefined') return;
    state.editTarget = id;
    const p = DB.products.find(p=>p.id===id);
    openModal('addProduct');
    setTimeout(() => {
      const titleEl = document.getElementById('modalTitle');
      if (titleEl) titleEl.textContent = 'Edit Product';
      fillModalEdit('editProduct', p);
    }, 10);
  }
  
  function openEditCustomer(id) {
    if (typeof DB === 'undefined') return;
    state.editTarget = id;
    const c = DB.customers.find(c=>c.id===id);
    openModal('addCustomer');
    setTimeout(() => {
      const titleEl = document.getElementById('modalTitle');
      const nameEl = document.getElementById('f_cname');
      const phoneEl = document.getElementById('f_phone');
      const emailEl = document.getElementById('f_email');
      const addressEl = document.getElementById('f_address');
      
      if (titleEl) titleEl.textContent = 'Edit Customer';
      if (nameEl) nameEl.value = c.customer_name;
      if (phoneEl) phoneEl.value = c.phone;
      if (emailEl) emailEl.value = c.email;
      if (addressEl) addressEl.value = c.address;
    }, 10);
  }
  
  function openEditUser(id) {
    if (typeof DB === 'undefined') return;
    state.editTarget = id;
    const u = DB.users.find(u=>u.id===id);
    openModal('addUser');
    setTimeout(() => {
      const titleEl = document.getElementById('modalTitle');
      const nameEl = document.getElementById('f_uname');
      const emailEl = document.getElementById('f_uemail');
      const roleEl = document.getElementById('f_urole');
      const statusEl = document.getElementById('f_ustatus');
      
      if (titleEl) titleEl.textContent = 'Edit User';
      if (nameEl) nameEl.value = u.name;
      if (emailEl) emailEl.value = u.email;
      if (roleEl) roleEl.value = u.role;
      if (statusEl) statusEl.value = u.status;
    }, 10);
  }

  //delete functions
  function openDelete(type, id, name) {
    const msgEl = document.getElementById('deleteMsg');
    const overlay = document.getElementById('deleteOverlay');
    if (msgEl) msgEl.textContent = `Delete "${name}"? This cannot be undone.`;
    state.deleteTarget = { type, id };
    if (overlay) overlay.classList.add('open');
  }
  
  function closeDelete() { 
    const overlay = document.getElementById('deleteOverlay');
    if (overlay) overlay.classList.remove('open'); 
    state.deleteTarget = null; 
  }
  
  function confirmDelete() {
    if (typeof DB === 'undefined' || !state.deleteTarget) return;
    const { type, id } = state.deleteTarget;
    if(type==='product') { 
      DB.products.splice(DB.products.findIndex(p=>p.id===id),1); 
      renderProductsTable(); 
      updateProductStats(); 
      showToast('success','Deleted','Product removed.'); 
    }
    if(type==='customer') { 
      DB.customers.splice(DB.customers.findIndex(c=>c.id===id),1); 
      renderCustomersTable(); 
      updateCustomerStats(); 
      showToast('success','Deleted','Customer removed.'); 
    }
    if(type==='transaction') { 
      DB.transactions.splice(DB.transactions.findIndex(t=>t.id===id),1); 
      renderTransactionsTable(); 
      updateTrxStats(); 
      showToast('success','Deleted','Transaction removed.'); 
    }
    if(type==='user') { 
      DB.users.splice(DB.users.findIndex(u=>u.id===id),1); 
      renderUsersTable(); 
      showToast('success','Deleted','User removed.'); 
    }
    closeDelete();
  }

  //report functions
  function generateReport(type) {
    if (typeof DB === 'undefined') return;
    state.currentReport = type;
    document.querySelectorAll('.report-card').forEach((c,i) => {
      const types = ['revenue','product','customer','inventory'];
      c.style.outline = types[i]===type ? '2px solid var(--accent)' : '';
      c.style.outlineOffset = '2px';
    });
    const header = document.getElementById('reportHeaderRow');
    const tbody = document.getElementById('reportTableBody');
    const titleEl = document.getElementById('reportTitle');
    
    if (titleEl) titleEl.textContent = type.charAt(0).toUpperCase()+type.slice(1)+' Report';
    
    if(type==='revenue') {
      if (header) header.innerHTML = '<th>Month</th><th>Transactions</th><th>Total Revenue</th><th>Avg. Order</th>';
      const monthly = {};
      DB.transactions.forEach(t => {
        const m = t.transaction_date.slice(0,7);
        if(!monthly[m]) monthly[m]={count:0,rev:0};
        monthly[m].count++; monthly[m].rev+=t.total_price;
      });
      if (tbody) {
        tbody.innerHTML = Object.entries(monthly).sort().map(([m,d])=>`
          <tr><td>${m}</td><td>${d.count}</td><td style="font-weight:600">${fmtRpFull(d.rev)}</td><td>${fmtRp(d.rev/d.count)}</td></tr>
        `).join('') + `<tr style="font-weight:700;border-top:2px solid var(--border)"><td>TOTAL</td><td>${DB.transactions.length}</td><td>${fmtRpFull(DB.transactions.reduce((s,t)=>s+t.total_price,0))}</td><td>—</td></tr>`;
      }
    }
    if(type==='product') {
      if (header) header.innerHTML = '<th>Product</th><th>Category</th><th>Stock</th><th>Price</th><th>Value</th>';
      if (tbody) {
        tbody.innerHTML = DB.products.map(p=>`
          <tr><td style="font-weight:500">${p.product_name}</td><td>${p.category}</td>
          <td><span class="badge ${p.stock<=5?'badge-red':p.stock<=10?'badge-amber':'badge-green'}">${p.stock}</span></td>
          <td>${fmtRpFull(p.price)}</td><td style="font-weight:600">${fmtRp(p.price*p.stock)}</td>
        </tr>
        `).join('');
      }
    }
    if(type==='customer') {
      if (header) header.innerHTML = '<th>Name</th><th>Phone</th><th>Email</th><th>Address</th><th>Transactions</th>';
      if (tbody) {
        tbody.innerHTML = DB.customers.map(c=>{
          const trxCount = DB.transactions.filter(t=>t.customer_name===c.customer_name).length;
          return `<tr><td style="font-weight:500">${c.customer_name}</td><td>${c.phone}</td><td>${c.email}</td><td>${c.address}</td><td><span class="badge badge-blue">${trxCount}</span></td></tr>`;
        }).join('');
      }
    }
    if(type==='inventory') {
      if (header) header.innerHTML = '<th>Product</th><th>Category</th><th>Stock</th><th>Status</th>';
      if (tbody) {
        tbody.innerHTML = DB.products.sort((a,b)=>a.stock-b.stock).map(p=>{
          const status = p.stock<=5 ? '<span class="badge badge-red">⚠ Critical</span>' : p.stock<=10 ? '<span class="badge badge-amber">Low</span>' : '<span class="badge badge-green">OK</span>';
          return `<tr><td style="font-weight:500">${p.product_name}</td><td>${p.category}</td><td>${p.stock}</td><td>${status}</td></tr>`;
        }).join('');
      }
    }
  }

  function exportCSV() {
    const rows = []; 
    const header = [];
    const headerRows = document.querySelectorAll('#reportHeaderRow th');
    const bodyRows = document.querySelectorAll('#reportTableBody tr');
    
    headerRows.forEach(th => header.push(th.textContent));
    rows.push(header.join(','));
    bodyRows.forEach(tr => {
      const cells = [];
      tr.querySelectorAll('td').forEach(td => cells.push('"'+td.textContent.trim()+'"'));
      rows.push(cells.join(','));
    });
    const blob = new Blob([rows.join('\n')], {type:'text/csv'});
    const a = document.createElement('a'); 
    a.href = URL.createObjectURL(blob);
    a.download = state.currentReport + '_report.csv'; 
    a.click();
    showToast('success','Export Successful','CSV file downloaded.');
  }

  function exportPrint() { window.print(); }

  //import functions
  function handleDragOver(e) { 
    e.preventDefault(); 
    const dropZone = document.getElementById('dropZone');
    if (dropZone) dropZone.classList.add('drag-over'); 
  }
  
  function handleDragLeave() { 
    const dropZone = document.getElementById('dropZone');
    if (dropZone) dropZone.classList.remove('drag-over'); 
  }
  
  function handleDrop(e) { 
    e.preventDefault(); 
    handleDragLeave(); 
    const f=e.dataTransfer.files[0]; 
    if(f) processFile(f); 
  }
  
  function handleFileSelect(e) { 
    const f=e.target.files[0]; 
    if(f) processFile(f); 
  }

  function processFile(file) {
    if(!file.name.match(/\.(csv|txt)$/i)) { 
      showToast('error','Invalid File','Only CSV and TXT files are supported.'); 
      return; 
    }
    const prog = document.getElementById('uploadProgress');
    const fileNameEl = document.getElementById('uploadFileName');
    const bar = document.getElementById('uploadBar');
    const pct = document.getElementById('uploadPercent');
    
    if (prog) prog.classList.add('show');
    if (fileNameEl) fileNameEl.textContent = file.name;
    
    let p=0;
    const iv = setInterval(()=>{
      p += Math.random()*15;
      if(p>=100) { p=100; clearInterval(iv); }
      if (bar) bar.style.width = p+'%';
      if (pct) pct.textContent = Math.round(p)+'%';
      if(p===100) {
        const reader = new FileReader();
        reader.onload = e => {
          const text = e.target.result;
          const lines = text.trim().split('\n');
          const headers = lines[0].split(',');
          const preview = document.getElementById('filePreviewCard');
          const previewHeader = document.getElementById('previewHeader');
          const previewBody = document.getElementById('previewBody');
          const previewInfo = document.getElementById('previewInfo');
          
          if (previewHeader) previewHeader.innerHTML = headers.map(h=>`<th>${h.trim()}</th>`).join('');
          const rows = lines.slice(1,6);
          if (previewBody) previewBody.innerHTML = rows.map(r=>`<tr>${r.split(',').map(c=>`<td>${c.trim()}</td>`).join('')}</tr>`).join('');
          if (previewInfo) previewInfo.textContent = `${lines.length-1} rows · ${headers.length} columns`;
          if (preview) preview.style.display='';
          
          const importBadge = document.getElementById('importBadge');
          if (importBadge) importBadge.style.display='';
          
          showToast('success','File Ready',`${file.name} ready to import (${lines.length-1} rows)`);
        };
        reader.readAsText(file);
      }
    },40);
  }

  function simulateImport() {
    const target = document.getElementById('importTarget');
    const targetVal = target ? target.value : 'products';
    showToast('success','Import Complete',`Data successfully imported into ${targetVal}.`);
    const h = document.getElementById('importHistory');
    if (h) {
      const d = document.createElement('div');
      d.className='import-item';
      d.style.cssText='opacity:0;animation:fadeRow 0.3s ease forwards';
      d.innerHTML=`<span style="font-size:22px">✅</span><div style="flex:1"><div style="font-size:13.5px;font-weight:500">import_${Date.now()}.csv</div><div style="font-size:12px;color:var(--text3)">Imported to ${targetVal} · Just now</div></div><span class="badge badge-green">Success</span>`;
      h.prepend(d);
    }
    const importBadge = document.getElementById('importBadge');
    if (importBadge) importBadge.style.display='none';
  }

  //settings
  function saveSettings() {
    const companyName = document.getElementById('settingCompanyName');
    const address = document.getElementById('settingAddress');
    const currency = document.getElementById('settingCurrency');
    
    const data = {
      company_name: companyName ? companyName.value : '',
      address: address ? address.value : '',
      currency: currency ? currency.value : ''
    };
    localStorage.setItem('nexadmin_settings', JSON.stringify(data));
    showToast('success','Settings Saved','Your preferences have been updated.');
  }

  //toast
  function showToast(type, title, msg) {
    const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <span class="toast-icon">${icons[type]||'ℹ️'}</span>
      <div class="toast-body"><div class="toast-title">${title}</div><div class="toast-msg">${msg}</div></div>
      <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;
    const container = document.getElementById('toastContainer');
    if (container) {
      container.appendChild(toast);
      requestAnimationFrame(()=>{ requestAnimationFrame(()=>toast.classList.add('show')); });
      setTimeout(()=>{ 
        toast.classList.remove('show'); 
        toast.classList.add('hide'); 
        setTimeout(()=>toast.remove(),300); 
      }, 4000);
    }
  }

  function showNotifToast() {
    showToast('warning','Low Stock Alert','5 products have stock ≤ 5 units. Review inventory.');
  }

  //search
  function handleGlobalSearch(q) {
    if (!q || typeof DB === 'undefined') return;
    const lq = q.toLowerCase();
    const pMatch = DB.products.some(p=>p.product_name.toLowerCase().includes(lq));
    const cMatch = DB.customers.some(c=>c.customer_name.toLowerCase().includes(lq));
    if(pMatch) { 
      navigate('products'); 
      const searchInput = document.getElementById('productSearch');
      if (searchInput) searchInput.value = q;
      renderProductsTable(); 
    }
    else if(cMatch) { 
      navigate('customers'); 
      const searchInput = document.getElementById('customerSearch');
      if (searchInput) searchInput.value = q;
      renderCustomersTable(); 
    }
  }

  //css animation
  const animStyle = document.createElement('style');
  animStyle.textContent=`
    @keyframes fadeRow {
      from { opacity:0; transform:translateY(6px); }
      to   { opacity:1; transform:translateY(0); }
    }
  `;
  document.head.appendChild(animStyle);

  //overlay click
  const modalOverlay = document.getElementById('modalOverlay');
  const deleteOverlay = document.getElementById('deleteOverlay');
  
  if (modalOverlay) {
    modalOverlay.addEventListener('click', e => { 
      if(e.target===e.currentTarget) closeModal(); 
    });
  }
  if (deleteOverlay) {
    deleteOverlay.addEventListener('click', e => { 
      if(e.target===e.currentTarget) closeDelete(); 
    });
  }

  window.navigate = navigate;
  window.toggleSidebar = toggleSidebar;
  window.closeSidebar = closeSidebar;
  window.toggleTheme = toggleTheme;
  window.toggleThemeFromSettings = toggleThemeFromSettings;
  window.setChartPeriod = setChartPeriod;
  window.sortTable = sortTable;
  window.openModal = openModal;
  window.closeModal = closeModal;
  window.saveProduct = saveProduct;
  window.saveCustomer = saveCustomer;
  window.saveTransaction = saveTransaction;
  window.saveUser = saveUser;
  window.openEditProduct = openEditProduct;
  window.openEditCustomer = openEditCustomer;
  window.openEditUser = openEditUser;
  window.openDelete = openDelete;
  window.closeDelete = closeDelete;
  window.confirmDelete = confirmDelete;
  window.generateReport = generateReport;
  window.exportCSV = exportCSV;
  window.exportPrint = exportPrint;
  window.handleDragOver = handleDragOver;
  window.handleDragLeave = handleDragLeave;
  window.handleDrop = handleDrop;
  window.handleFileSelect = handleFileSelect;
  window.simulateImport = simulateImport;
  window.saveSettings = saveSettings;
  window.showNotifToast = showNotifToast;
  window.handleGlobalSearch = handleGlobalSearch;
  window.changePage = changePage;

  //initialize
  refreshDashboard();
  
  //animation
  if(typeof gsap !== 'undefined') {
    gsap.from('.nav-item', { opacity:0, x:-18, duration:0.4, stagger:0.06, ease:'power2.out', delay:0.1 });
    gsap.from('.sidebar-logo', { opacity:0, duration:0.4, ease:'power2.out' });
    gsap.from('.topbar', { opacity:0, y:-10, duration:0.35, ease:'power2.out' });
  }
  
  //toast
  setTimeout(()=>showToast('info','Welcome back','MaxoAdmin dashboard loaded successfully.'), 1200);
});