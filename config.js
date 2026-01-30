// ===== FIREBASE YAPILANDIRMA =====
// Bu dosyayı düzenleyerek kendi Firebase projenizi bağlayın

// ADIM 1: Firebase Console'a gidin: https://console.firebase.google.com
// ADIM 2: Yeni proje oluşturun (ücretsiz)
// ADIM 3: Realtime Database ekleyin
// ADIM 4: Aşağıdaki bilgileri Firebase Console'dan kopyalayın

const firebaseConfig = {
    apiKey: "AIzaSyBi44kxd7IQAyb1sBXtu9luWWNeVJiEVHs",
    authDomain: "kuafor-randevu-87113.firebaseapp.com",
    databaseURL: "https://kuafor-randevu-87113-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "kuafor-randevu-87113",
    storageBucket: "kuafor-randevu-87113.firebasestorage.app",
    messagingSenderId: "114014754514",
    appId: "1:114014754514:web:7be1c7fb34c4c27655bf0b"
};

// Firebase başlat
firebase.initializeApp(firebaseConfig);

// Database referansı
const database = firebase.database();
const appointmentsRef = database.ref('appointments');

// Kuaför telefon numarası (WhatsApp için)
// Başında 90 olacak şekilde, boşluksuz: 905551234567
const BARBER_PHONE = '905446580135';

console.log('✅ Firebase bağlantısı kuruldu');
