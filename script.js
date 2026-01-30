// ===== KUAFÖR RANDEVU SİSTEMİ =====
// ===== WHATSAPP ONAY SİSTEMLİ =====

// ===== GLOBAL DEĞİŞKENLER =====
let selectedTime = null;
let appointments = [];
let filteredAppointments = [];

// Kuaför telefon numarası (WhatsApp için)
const BARBER_PHONE = '905446580135'; // Buraya gerçek numarayı yazın (başında 90 olacak şekilde)

// ===== ÇALIŞMA SAATLERİ =====
const WORKING_HOURS = {
    start: 9,
    end: 21,
    lunchStart: 13,
    lunchEnd: 14,
    appointmentDuration: 40
};

const SUNDAY = 0;

// ===== ADMİN BİLGİLERİ =====
const ADMIN = {
    username: 'admin',
    password: '1234'
};

// ===== RANDEVU DURUMLARI =====
const STATUS = {
    PENDING: 'pending',      // Onay bekliyor
    APPROVED: 'approved',    // Onaylandı
    CANCELLED: 'cancelled'   // İptal edildi
};

// ===== SAYFA YÜKLENDİĞİNDE =====
document.addEventListener('DOMContentLoaded', function() {
    loadAppointments();
    
    // Müşteri sayfasındaysak
    if (document.getElementById('appointmentForm')) {
        initCustomerPage();
    }
});

// ===== MÜŞTERİ SAYFASI BAŞLAT =====
function initCustomerPage() {
    const dateInput = document.getElementById('appointmentDate');
    const form = document.getElementById('appointmentForm');
    
    // Minimum tarihi ayarla
    const today = new Date();
    dateInput.min = today.toISOString().split('T')[0];
    
    // EN YAKIN UYGUN TARİH VE SAATI OTOMATIK SEÇ
    autoSelectNearestAvailable(dateInput);
    
    // Her 5 saniyede bir saatleri güncelle (eşzamanlı randevu önleme)
    setInterval(function() {
        if (dateInput.value) {
            const currentSelectedTime = selectedTime;
            updateTimeSlots();
            // Eğer seçili saat dolmuşsa seçimi kaldır
            if (currentSelectedTime && isTimeSlotBooked(dateInput.value, currentSelectedTime)) {
                selectedTime = null;
                document.getElementById('selectedTimeInfo').textContent = '⚠️ Seçtiğiniz saat alındı, lütfen yeni saat seçin';
                document.getElementById('selectedTimeInfo').style.color = 'var(--danger-color)';
            }
        }
    }, 5000);
    
    // Tarih değiştiğinde saatleri güncelle
    dateInput.addEventListener('change', function() {
        selectedTime = null; // Saat seçimini sıfırla
        updateTimeSlots();
    });
    
    // Form gönderildiğinde
    form.addEventListener('submit', createAppointment);
    
    // Modal kapatma
    const closeBtn = document.querySelector('.close-modal');
    if (closeBtn) {
        closeBtn.onclick = closeWhatsAppModal;
    }
    
    window.onclick = function(event) {
        const modal = document.getElementById('whatsappModal');
        if (event.target == modal) {
            closeWhatsAppModal();
        }
    };
}

// ===== EN YAKIN UYGUN TARİH VE SAATI OTOMATIK SEÇ =====
function autoSelectNearestAvailable(dateInput) {
    // Önce güncel verileri yükle
    loadAppointments();
    
    const today = new Date();
    let currentDate = new Date(today);
    let foundDate = false;
    
    // En fazla 30 gün ileriye bak
    for (let i = 0; i < 30; i++) {
        // Pazar değilse
        if (currentDate.getDay() !== SUNDAY) {
            const dateString = currentDate.toISOString().split('T')[0];
            
            // Bu tarihte boş saat var mı?
            const firstAvailableTime = getFirstAvailableTime(dateString);
            
            if (firstAvailableTime) {
                // Tarihi seç
                dateInput.value = dateString;
                
                // Saatleri göster
                updateTimeSlots();
                
                // İlk boş saati otomatik seç
                setTimeout(() => {
                    const timeSlots = document.querySelectorAll('.time-slot:not(.booked)');
                    if (timeSlots.length > 0) {
                        selectTimeSlot(timeSlots[0], firstAvailableTime);
                    }
                }, 100);
                
                foundDate = true;
                break;
            }
        }
        
        // Bir gün ileri
        currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Uygun gün bulunamadıysa bugünü göster
    if (!foundDate) {
        if (today.getDay() !== SUNDAY) {
            dateInput.value = today.toISOString().split('T')[0];
        } else {
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateInput.value = tomorrow.toISOString().split('T')[0];
        }
        updateTimeSlots();
    }
}

// ===== BİR TARİHTEKİ İLK BOŞ SAATİ BUL =====
function getFirstAvailableTime(dateString) {
    const startMinutes = WORKING_HOURS.start * 60;
    const endMinutes = WORKING_HOURS.end * 60;
    const lunchStartMinutes = WORKING_HOURS.lunchStart * 60;
    const lunchEndMinutes = WORKING_HOURS.lunchEnd * 60;
    
    let currentMinutes = startMinutes;
    
    while (currentMinutes < endMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        const appointmentEndMinutes = currentMinutes + WORKING_HOURS.appointmentDuration;
        
        // Randevu bitiş saati kontrolü
        if (appointmentEndMinutes > endMinutes) {
            break;
        }
        
        // Randevu öğle molasına denk geliyor mu
        if (currentMinutes < lunchStartMinutes && appointmentEndMinutes > lunchStartMinutes) {
            currentMinutes = lunchEndMinutes;
            continue;
        }
        
        // Öğle molası içinde mi
        if (currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes) {
            currentMinutes = lunchEndMinutes;
            continue;
        }
        
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        if (!isTimeSlotBooked(dateString, timeString)) {
            return timeString;
        }
        
        currentMinutes += WORKING_HOURS.appointmentDuration;
    }
    
    return null;
}

// ===== SAAT SLOTLARINI GÖSTER =====
function updateTimeSlots() {
    // Güncel verileri yükle
    loadAppointments();
    
    const dateInput = document.getElementById('appointmentDate');
    const timeSlotsContainer = document.getElementById('timeSlots');
    const selectedDate = dateInput.value;
    
    if (!selectedDate) {
        timeSlotsContainer.innerHTML = '<div class="loading">Lütfen tarih seçin</div>';
        return;
    }
    
    const date = new Date(selectedDate + 'T00:00:00');
    
    // Pazar kontrolü
    if (date.getDay() === SUNDAY) {
        timeSlotsContainer.innerHTML = '<div class="no-slots">Pazar günleri kapalıyız</div>';
        return;
    }
    
    timeSlotsContainer.innerHTML = '';
    
    // Çalışma saatlerini dakikaya çevir
    const startMinutes = WORKING_HOURS.start * 60; // 09:00 = 540 dakika
    const endMinutes = WORKING_HOURS.end * 60; // 21:00 = 1260 dakika
    const lunchStartMinutes = WORKING_HOURS.lunchStart * 60; // 13:00 = 780 dakika
    const lunchEndMinutes = WORKING_HOURS.lunchEnd * 60; // 14:00 = 840 dakika
    
    let currentMinutes = startMinutes;
    
    // Randevu slotlarını oluştur
    while (currentMinutes < endMinutes) {
        const hour = Math.floor(currentMinutes / 60);
        const minute = currentMinutes % 60;
        const appointmentEndMinutes = currentMinutes + WORKING_HOURS.appointmentDuration;
        
        // Randevu bitiş saati çalışma saatini geçiyorsa dur
        if (appointmentEndMinutes > endMinutes) {
            break;
        }
        
        // Randevu öğle molasına denk geliyor mu kontrol et
        if (currentMinutes < lunchStartMinutes && appointmentEndMinutes > lunchStartMinutes) {
            // Öğle molası sonrasına atla (14:00)
            currentMinutes = lunchEndMinutes;
            continue;
        }
        
        // Öğle molası içindeyse atla
        if (currentMinutes >= lunchStartMinutes && currentMinutes < lunchEndMinutes) {
            currentMinutes = lunchEndMinutes;
            continue;
        }
        
        // Saat slotunu oluştur
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isBooked = isTimeSlotBooked(selectedDate, timeString);
        
        const timeSlot = document.createElement('div');
        timeSlot.className = 'time-slot';
        timeSlot.textContent = timeString;
        
        if (isBooked) {
            timeSlot.classList.add('booked');
            timeSlot.textContent += ' DOLU';
        } else {
            timeSlot.addEventListener('click', function() {
                selectTimeSlot(this, timeString);
            });
        }
        
        timeSlotsContainer.appendChild(timeSlot);
        
        // Bir sonraki randevu saatine geç
        currentMinutes += WORKING_HOURS.appointmentDuration;
    }
}

// ===== SAAT DOLU MU KONTROL ET =====
function isTimeSlotBooked(date, time) {
    // ONAY BEKLİYOR veya ONAYLANDI randevular saati doldurur
    return appointments.some(apt => 
        apt.date === date && 
        apt.time === time && 
        (apt.status === STATUS.PENDING || apt.status === STATUS.APPROVED)
    );
}

// ===== SAAT SEÇ =====
function selectTimeSlot(element, time) {
    // Önceki seçimi kaldır
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    element.classList.add('selected');
    selectedTime = time;
    
    // Bilgi göster
    const info = document.getElementById('selectedTimeInfo');
    info.textContent = `Seçilen saat: ${time}`;
    info.style.color = 'var(--success-color)';
}

// ===== RANDEVU OLUŞTUR =====
function createAppointment(event) {
    event.preventDefault();
    
    const date = document.getElementById('appointmentDate').value;
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    
    // Validasyon
    if (!date || !selectedTime || !name || !phone) {
        alert('⚠️ Lütfen tüm alanları doldurun!');
        return;
    }
    
    // Telefon kontrolü
    if (phone.length < 10) {
        alert('⚠️ Geçerli bir telefon numarası girin!');
        return;
    }
    
    // KRİTİK: Son kez güncel verileri yükle (eşzamanlı randevu önleme)
    loadAppointments();
    
    // ÇAKIŞMA KONTROLÜ - SON KEZ KONTROL ET
    if (isTimeSlotBooked(date, selectedTime)) {
        alert('⚠️ Bu saat başka bir müşteri tarafından alınmış! Lütfen başka bir saat seçin.');
        updateTimeSlots();
        selectedTime = null;
        document.getElementById('selectedTimeInfo').textContent = '';
        return;
    }
    
    // Yeni randevu oluştur
    const newAppointment = {
        id: Date.now(),
        date: date,
        time: selectedTime,
        name: name,
        phone: phone,
        status: STATUS.PENDING, // Onay bekliyor
        createdAt: new Date().toISOString()
    };
    
    appointments.push(newAppointment);
    saveAppointments();
    
    // WhatsApp modal göster
    showWhatsAppModal(newAppointment);
    
    // Formu temizle
    document.getElementById('appointmentForm').reset();
    selectedTime = null;
    
    // Saatleri güncelle
    autoSelectNearestAvailable(document.getElementById('appointmentDate'));
}

// ===== WHATSAPP MODAL GÖSTER =====
function showWhatsAppModal(appointment) {
    const modal = document.getElementById('whatsappModal');
    const summaryDiv = document.getElementById('appointmentSummary');
    const whatsappBtn = document.getElementById('whatsappButton');
    
    // Tarih formatla
    const dateObj = new Date(appointment.date + 'T00:00:00');
    const dateFormatted = dateObj.toLocaleDateString('tr-TR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Özet bilgi
    summaryDiv.innerHTML = `
        <p><strong>📅 Tarih:</strong> ${dateFormatted}</p>
        <p><strong>🕐 Saat:</strong> ${appointment.time}</p>
        <p><strong>👤 Ad Soyad:</strong> ${appointment.name}</p>
        <p><strong>📱 Telefon:</strong> ${appointment.phone}</p>
    `;
    
    // WhatsApp mesajı oluştur - Admin için detaylı
    const message = `🪮 *YENİ RANDEVU TALEBİ*

📅 *Tarih:* ${dateFormatted}
🕐 *Saat:* ${appointment.time}
👤 *Müşteri:* ${appointment.name}
📱 *Telefon:* ${appointment.phone}

⚠️ Bu randevu talebini admin panelinden *ONAYLAMANIZ* gerekiyor!

🔐 Admin paneline giriş yaparak randevuyu onaylayın veya iptal edin.

Randevu ID: ${appointment.id}`;
    
    // WhatsApp linki
    const whatsappUrl = `https://wa.me/${BARBER_PHONE}?text=${encodeURIComponent(message)}`;
    whatsappBtn.href = whatsappUrl;
    
    modal.style.display = 'block';
}

// ===== WHATSAPP MODAL KAPAT =====
function closeWhatsAppModal() {
    document.getElementById('whatsappModal').style.display = 'none';
}

// ===== RANDEVULARI KAYDET =====
function saveAppointments() {
    localStorage.setItem('appointments', JSON.stringify(appointments));
}

// ===== RANDEVULARI YÜKLE =====
function loadAppointments() {
    const stored = localStorage.getItem('appointments');
    appointments = stored ? JSON.parse(stored) : [];
}

// ===== ADMİN PANEL FONKSİYONLARI =====

function initAdminPage() {
    const loginForm = document.getElementById('loginForm');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    
    // Session kontrolü
    if (sessionStorage.getItem('adminLoggedIn') === 'true') {
        showAdminPanel();
    }
}

// ===== ADMİN GİRİŞ =====
function handleLogin(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');
    
    if (username === ADMIN.username && password === ADMIN.password) {
        sessionStorage.setItem('adminLoggedIn', 'true');
        showAdminPanel();
    } else {
        errorMsg.textContent = '❌ Kullanıcı adı veya şifre hatalı!';
    }
}

// ===== ADMİN PANELİ GÖSTER =====
function showAdminPanel() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    
    updateStats();
    displayAppointments();
}

// ===== İSTATİSTİKLERİ GÜNCELLE =====
function updateStats() {
    loadAppointments();
    
    const total = appointments.length;
    const pending = appointments.filter(a => a.status === STATUS.PENDING).length;
    const approved = appointments.filter(a => a.status === STATUS.APPROVED).length;
    const cancelled = appointments.filter(a => a.status === STATUS.CANCELLED).length;
    
    document.getElementById('totalAppointments').textContent = total;
    document.getElementById('pendingAppointments').textContent = pending;
    document.getElementById('approvedAppointments').textContent = approved;
    document.getElementById('cancelledAppointments').textContent = cancelled;
}

// ===== FİLTRELERİ UYGULA =====
function applyFilters() {
    const filterDate = document.getElementById('filterDate').value;
    const filterStatus = document.getElementById('filterStatus').value;
    
    filteredAppointments = appointments.filter(apt => {
        let match = true;
        
        if (filterDate && apt.date !== filterDate) {
            match = false;
        }
        
        if (filterStatus !== 'all' && apt.status !== filterStatus) {
            match = false;
        }
        
        return match;
    });
    
    displayAppointments();
}

// ===== FİLTRELERİ SIFIRLA =====
function resetFilters() {
    document.getElementById('filterDate').value = '';
    document.getElementById('filterStatus').value = 'all';
    filteredAppointments = [...appointments];
    displayAppointments();
}

// ===== RANDEVULARI GÖSTER =====
function displayAppointments() {
    loadAppointments();
    
    if (filteredAppointments.length === 0) {
        filteredAppointments = [...appointments];
    }
    
    const listDiv = document.getElementById('appointmentsList');
    
    if (filteredAppointments.length === 0) {
        listDiv.innerHTML = '<div class="no-appointments">📭 Henüz randevu yok</div>';
        return;
    }
    
    // Tarihe göre sırala
    filteredAppointments.sort((a, b) => {
        if (a.date !== b.date) {
            return new Date(a.date) - new Date(b.date);
        }
        return a.time.localeCompare(b.time);
    });
    
    let html = '';
    
    filteredAppointments.forEach(apt => {
        const dateObj = new Date(apt.date + 'T00:00:00');
        const dateFormatted = dateObj.toLocaleDateString('tr-TR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        
        let statusBadge = '';
        let statusClass = '';
        
        if (apt.status === STATUS.PENDING) {
            statusBadge = 'ONAY BEKLİYOR';
            statusClass = 'status-pending';
        } else if (apt.status === STATUS.APPROVED) {
            statusBadge = 'ONAYLANDI';
            statusClass = 'status-approved';
        } else if (apt.status === STATUS.CANCELLED) {
            statusBadge = 'İPTAL EDİLDİ';
            statusClass = 'status-cancelled';
        }
        
        html += `
            <div class="appointment-item">
                <div class="appointment-header">
                    <div class="appointment-date-time">
                        📅 ${dateFormatted} • 🕐 ${apt.time}
                    </div>
                    <span class="status-badge ${statusClass}">${statusBadge}</span>
                </div>
                <div class="appointment-details">
                    <div class="detail-item">
                        <span>👤</span>
                        <span><strong>Müşteri:</strong> ${apt.name}</span>
                    </div>
                    <div class="detail-item">
                        <span>📱</span>
                        <span><strong>Telefon:</strong> ${apt.phone}</span>
                    </div>
                    <div class="detail-item">
                        <span>🆔</span>
                        <span><strong>Randevu ID:</strong> ${apt.id}</span>
                    </div>
                </div>
                ${apt.status === STATUS.PENDING ? `
                    <div class="appointment-note">
                        <p style="color: var(--warning-color); font-weight: 600; margin: 10px 0;">
                            ⚠️ Bu randevu WhatsApp'tan gönderildi ve onayınızı bekliyor!
                        </p>
                        <p style="color: var(--gray-color); font-size: 0.9em;">
                            Onayladığınızda saat bloğu tamamen dolacak ve başka kimse bu saate randevu alamayacak.
                        </p>
                    </div>
                ` : ''}
                ${apt.status === STATUS.APPROVED ? `
                    <div class="appointment-note">
                        <p style="color: var(--success-color); font-weight: 600; margin: 10px 0;">
                            ✅ Bu randevu onaylandı ve kesinleşti! Saat bloğu dolu.
                        </p>
                    </div>
                ` : ''}
                ${apt.status === STATUS.CANCELLED ? `
                    <div class="appointment-note">
                        <p style="color: var(--danger-color); font-weight: 600; margin: 10px 0;">
                            ❌ Bu randevu iptal edildi. Saat bloğu boşaldı ve tekrar kullanılabilir.
                        </p>
                    </div>
                ` : ''}
                <div class="appointment-actions">
                    ${apt.status === STATUS.PENDING ? `
                        <button class="btn-action btn-approve" onclick="approveAppointment(${apt.id})">
                            ✅ Onayla ve Kesinleştir
                        </button>
                        <button class="btn-action btn-cancel" onclick="cancelAppointment(${apt.id})">
                            ❌ Reddet ve İptal Et
                        </button>
                    ` : ''}
                    ${apt.status === STATUS.APPROVED ? `
                        <button class="btn-action btn-cancel" onclick="cancelAppointment(${apt.id})">
                            ❌ İptal Et (Saat Boşalır)
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    listDiv.innerHTML = html;
}

// ===== RANDEVU ONAYLA =====
function approveAppointment(id) {
    const apt = appointments.find(a => a.id === id);
    
    if (!apt) {
        alert('❌ Randevu bulunamadı!');
        return;
    }
    
    // Onay mesajı
    const dateObj = new Date(apt.date + 'T00:00:00');
    const dateFormatted = dateObj.toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    const confirmMsg = `✅ RANDEVU ONAY
    
📅 Tarih: ${dateFormatted}
🕐 Saat: ${apt.time}
👤 Müşteri: ${apt.name}
📱 Telefon: ${apt.phone}

⚠️ ONAYLADIĞINIZDA:
• Bu saat bloğu tamamen dolacak
• Başka kimse bu saate randevu alamayacak
• Müşteri ile randevu kesinleşmiş olacak

Bu randevuyu onaylamak istediğinizden emin misiniz?`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    apt.status = STATUS.APPROVED;
    apt.approvedAt = new Date().toISOString();
    saveAppointments();
    updateStats();
    displayAppointments();
    
    alert('✅ Randevu onaylandı ve kesinleşti!\n\nSaat bloğu artık dolu ve başka kimse bu saate randevu alamayacak.');
}

// ===== RANDEVU İPTAL ET =====
function cancelAppointment(id) {
    const apt = appointments.find(a => a.id === id);
    
    if (!apt) {
        alert('❌ Randevu bulunamadı!');
        return;
    }
    
    // İptal mesajı
    const dateObj = new Date(apt.date + 'T00:00:00');
    const dateFormatted = dateObj.toLocaleDateString('tr-TR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
    
    const statusText = apt.status === STATUS.PENDING ? 'reddetmek' : 'iptal etmek';
    
    const confirmMsg = `❌ RANDEVU İPTAL
    
📅 Tarih: ${dateFormatted}
🕐 Saat: ${apt.time}
👤 Müşteri: ${apt.name}
📱 Telefon: ${apt.phone}
📊 Durum: ${apt.status === STATUS.PENDING ? 'Onay Bekliyor' : 'Onaylanmış'}

⚠️ İPTAL ETTİĞİNİZDE:
• Saat bloğu otomatik boşalacak
• Bu saate yeni randevu alınabilecek
• Randevu durumu "İptal Edildi" olacak

Bu randevuyu ${statusText} istediğinizden emin misiniz?`;
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    apt.status = STATUS.CANCELLED;
    apt.cancelledAt = new Date().toISOString();
    saveAppointments();
    updateStats();
    displayAppointments();
    
    alert('❌ Randevu iptal edildi!\n\nSaat bloğu boşaldı ve bu saate yeni randevu alınabilir.');
}

// ===== ÇIKIŞ YAP =====
function logout() {
    sessionStorage.removeItem('adminLoggedIn');
    window.location.reload();
}

// ===== GLOBAL FONKSİYONLAR =====
window.closeWhatsAppModal = closeWhatsAppModal;
window.initAdminPage = initAdminPage;
window.logout = logout;
window.applyFilters = applyFilters;
window.resetFilters = resetFilters;
window.approveAppointment = approveAppointment;
window.cancelAppointment = cancelAppointment;
