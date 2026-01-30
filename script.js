// ===== SAMET TOTAŞ KUAFÖR RANDEVU SİSTEMİ =====

// ===== GLOBAL DEĞİŞKENLER =====
let selectedTime = null;
let appointments = [];
let filteredAppointments = [];

// ===== KUAFÖR WHATSAPP NUMARASI =====
const BARBER_PHONE = '905446580135';

// ===== ÇALIŞMA SAATLERİ =====
const WORKING_HOURS = {
    start: 9,
    end: 21,
    lunchStart: 13,
    lunchEnd: 14
};

const SUNDAY = 0;

// ===== ADMIN =====
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: '1234'
};

// ===== SAYFA YÜKLENDİ =====
document.addEventListener('DOMContentLoaded', () => {
    loadAppointments();
    autoCancelExpiredAppointments();

    if (document.getElementById('appointmentForm')) {
        initCustomerPage();
    }

    if (document.getElementById('loginForm')) {
        initAdminPage();
    }
});

// ===== MÜŞTERİ SAYFASI =====
function initCustomerPage() {
    const dateInput = document.getElementById('appointmentDate');
    dateInput.min = new Date().toISOString().split('T')[0];
    setNearestAvailableDate(dateInput);

    dateInput.addEventListener('change', updateTimeSlots);
    document.getElementById('appointmentForm').addEventListener('submit', createAppointment);
}

// ===== SAATLER =====
function updateTimeSlots() {
    const container = document.getElementById('timeSlots');
    const date = document.getElementById('appointmentDate').value;
    container.innerHTML = '';
    selectedTime = null;

    if (!date) return;

    const d = new Date(date + 'T00:00:00');
    if (d.getDay() === SUNDAY) {
        container.innerHTML = '<p>Pazar günleri kapalıyız</p>';
        return;
    }

    for (let h = WORKING_HOURS.start; h < WORKING_HOURS.end; h++) {
        if (h === WORKING_HOURS.lunchStart) continue;

        for (let m of [0, 40]) {
            if (h === 20 && m === 40) continue;

            const time = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            const div = document.createElement('div');
            div.className = 'time-slot';
            div.textContent = time;

            if (isTimeSlotBooked(date, time)) {
                div.classList.add('booked');
                div.textContent += ' (DOLU)';
            } else {
                div.onclick = () => selectTimeSlot(div, time);
            }
            container.appendChild(div);
        }
    }
}

// ===== SAAT DOLU MU? (SADECE ONAYLANANLAR) =====
function isTimeSlotBooked(date, time) {
    return appointments.some(a =>
        a.date === date &&
        a.time === time &&
        a.status === 'ONAYLANDI'
    );
}

// ===== SAAT SEÇ =====
function selectTimeSlot(el, time) {
    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
    el.classList.add('selected');
    selectedTime = time;
}

// ===== RANDEVU OLUŞTUR =====
function createAppointment(e) {
    e.preventDefault();

    const date = appointmentDate.value;
    const name = customerName.value.trim();
    const phone = customerPhone.value.trim();

    if (!date || !selectedTime || !name || !phone) {
        alert('Tüm alanları doldurun');
        return;
    }

    const appointment = {
        id: Date.now(),
        date,
        time: selectedTime,
        name,
        phone,
        status: 'ONAY BEKLİYOR',
        createdAt: Date.now()
    };

    appointments.push(appointment);
    saveAppointments();
    showSuccessMessage(appointment);
    updateTimeSlots();
    appointmentForm.reset();
}

// ===== BAŞARI MODALI =====
function showSuccessMessage(app) {
    const link = generateWhatsAppLink(app);
    appointmentSummary.innerHTML = `
        <p><strong>${app.date} ${app.time}</strong></p>
        <p>${app.name}</p>
        <p>⏳ 30 dk içinde WhatsApp’tan onaylayın</p>
        <a href="${link}" target="_blank" class="whatsapp-btn">
            📲 WhatsApp’tan Onayla
        </a>
    `;
    successModal.style.display = 'block';
}

function closeModal() {
    successModal.style.display = 'none';
}

// ===== LOCAL STORAGE =====
function saveAppointments() {
    localStorage.setItem('appointments', JSON.stringify(appointments));
}
function loadAppointments() {
    appointments = JSON.parse(localStorage.getItem('appointments')) || [];
}

// ===== 30 DK ONAY GELMEZSE SİL =====
function autoCancelExpiredAppointments() {
    const now = Date.now();
    appointments = appointments.filter(a =>
        a.status === 'ONAYLANDI' ||
        (now - a.createdAt) / 60000 <= 30
    );
    saveAppointments();
}

// ===== EN YAKIN TARİH =====
function setNearestAvailableDate(input) {
    let d = new Date();
    for (let i = 0; i < 30; i++) {
        if (d.getDay() !== SUNDAY) {
            input.value = d.toISOString().split('T')[0];
            updateTimeSlots();
            return;
        }
        d.setDate(d.getDate() + 1);
    }
}

// ===== ADMIN =====
function initAdminPage() {
    if (sessionStorage.getItem('adminLoggedIn')) showAdminPanel();
    loginForm.addEventListener('submit', handleLogin);
}

function handleLogin(e) {
    e.preventDefault();
    if (username.value === 'admin' && password.value === '1234') {
        sessionStorage.setItem('adminLoggedIn', true);
        showAdminPanel();
    } else alert('Hatalı giriş');
}

function showAdminPanel() {
    loginScreen.style.display = 'none';
    adminPanel.style.display = 'block';
    renderAdmin();
}

function renderAdmin() {
    appointmentsList.innerHTML = '';
    appointments.forEach(a => {
        appointmentsList.innerHTML += `
            <div>
                ${a.date} ${a.time} - ${a.name}
                <strong>${a.status}</strong>
                ${a.status === 'ONAY BEKLİYOR' ? `
                <button onclick="approve(${a.id})">✅</button>
                <button onclick="reject(${a.id})">❌</button>` : ''}
            </div>
        `;
    });
}

function approve(id) {
    const a = appointments.find(x => x.id === id);
    a.status = 'ONAYLANDI';
    saveAppointments();
    renderAdmin();
}

function reject(id) {
    appointments = appointments.filter(x => x.id !== id);
    saveAppointments();
    renderAdmin();
}

function logout() {
    sessionStorage.clear();
    location.reload();
}

// ===== WHATSAPP =====
function generateWhatsAppLink(a) {
    const msg = encodeURIComponent(
        `Merhaba Samet Totaş Kuaför,\n${a.date} ${a.time} randevumu onaylatmak istiyorum.\n${a.name}`
    );
    return `https://wa.me/${BARBER_PHONE}?text=${msg}`;
}

// GLOBAL
window.closeModal = closeModal;
window.logout = logout;
window.approve = approve;
window.reject = reject;
