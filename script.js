// Firebase ve Uygulama Durumu
let currentUser = null;
let currentPhoto = null;
let stream = null;
let selectedDate = null;

// DOM Elemanları
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const userNameSpan = document.getElementById('user-name');

const camera = document.getElementById('camera');
const canvas = document.getElementById('canvas');
const photoPreview = document.getElementById('photo-preview');
const previewImg = document.getElementById('preview-img');
const takePhotoBtn = document.getElementById('take-photo-btn');
const captureBtn = document.getElementById('capture-btn');
const retakeBtn = document.getElementById('retake-btn');
const cameraFallback = document.getElementById('camera-fallback'); // Native kamera inputu
const productForm = document.getElementById('product-form');
const calendarButtons = document.getElementById('calendar-buttons');
const selectedDateInput = document.getElementById('selected-date');
const dateList = document.getElementById('date-list');
const photosContainer = document.getElementById('photos-container');
const photosGrid = document.getElementById('photos-grid');
const backBtn = document.getElementById('back-btn');
const deleteAllBtn = document.getElementById('delete-all-btn');
const selectedDateTitle = document.getElementById('selected-date-title');
const notificationPrompt = document.getElementById('notification-prompt');
const enableNotificationsBtn = document.getElementById('enable-notifications');
const installAppBtn = document.getElementById('install-app-btn');

// ==================== PWA KURULUM (A2HS) ====================
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    // Tarayıcının varsayılan kurulum penceresini otomatik açmasını engelle
    e.preventDefault();
    // Olayı daha sonra tetiklemek üzere sakla
    deferredPrompt = e;
    // Yükle butonunu görünür yap
    installAppBtn.classList.remove('hidden');
});

installAppBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
        // Kurulum penceresini göster
        deferredPrompt.prompt();
        // Kullanıcının kararı bekleniyor
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Kullanıcı kurulumu ${outcome === 'accepted' ? 'kabul etti' : 'reddetti'}`);
        // deferredPrompt sadece bir kez kullanılabilir
        deferredPrompt = null;
        // Butonu tekrar gizle
        installAppBtn.classList.add('hidden');
    }
});

// Zaten kurulduysa butonu sakla
window.addEventListener('appinstalled', () => {
    installAppBtn.classList.add('hidden');
    console.log('PWA başarıyla kuruldu');
});

// ==================== AUTH İŞLEMLERİ ====================

// Form geçişleri
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    registerForm.classList.add('hidden');
    loginForm.classList.remove('hidden');
});

// Kayıt Ol
registerBtn.addEventListener('click', async () => {
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    if (!name || !email || !password) {
        alert('Lütfen tüm alanları doldurun!');
        return;
    }

    if (password.length < 6) {
        alert('Şifre en az 6 karakter olmalıdır!');
        return;
    }

    try {
        // Kullanıcı oluştur
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);

        // Kullanıcı profilini güncelle
        await userCredential.user.updateProfile({
            displayName: name
        });

        // Firestore'a kullanıcı bilgisi kaydet
        await db.collection('users').doc(userCredential.user.uid).set({
            name: name,
            email: email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert('✅ Kayıt başarılı! Hoş geldiniz.');
    } catch (error) {
        console.error('Kayıt hatası:', error);
        alert('Hata: ' + error.message);
    }
});

// Giriş Yap
loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        alert('Lütfen e-posta ve şifrenizi girin!');
        return;
    }

    try {
        await auth.signInWithEmailAndPassword(email, password);
        alert('✅ Giriş başarılı!');
    } catch (error) {
        console.error('Giriş hatası:', error);
        alert('Hata: ' + error.message);
    }
});

// Çıkış Yap
logoutBtn.addEventListener('click', async () => {
    if (confirm('Çıkış yapmak istediğinizden emin misiniz?')) {
        await auth.signOut();
    }
});

// Auth durumu değişikliğini dinle
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        userNameSpan.textContent = user.displayName || user.email;

        // Uygulamayı başlat
        initializeApp();
    } else {
        currentUser = null;
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
});

// ==================== UYGULAMA İŞLEMLERİ ====================

function initializeApp() {
    generateCalendar();
    loadDates();
    checkNotifications();
}

// Dinamik Takvim Oluştur
function generateCalendar() {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    calendarButtons.innerHTML = '';

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateString = date.toISOString().split('T')[0];
        const isToday = day === today.getDate();
        const isPast = date < today && !isToday;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'calendar-btn';
        btn.textContent = day;
        btn.dataset.date = dateString;

        if (isToday) btn.classList.add('today');
        if (isPast) {
            btn.classList.add('past');
            btn.disabled = true;
        }

        btn.addEventListener('click', () => {
            if (!isPast) {
                document.querySelectorAll('.calendar-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                selectedDate = dateString;
                selectedDateInput.value = dateString;
            }
        });

        calendarButtons.appendChild(btn);
    }
}

// Kamerayı Tamamen Başlat
async function startCamera() {
    try {
        const constraints = {
            video: {
                facingMode: { ideal: "environment" },
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        camera.srcObject = stream;
        
        // Arayüz geçişleri
        camera.classList.remove('hidden');
        captureBtn.classList.remove('hidden');
        takePhotoBtn.classList.add('hidden');
        photoPreview.classList.add('hidden');
        
    } catch (error) {
        console.error('Kamera başlatılamadı:', error);
        alert('Kamera açılamadı. Lütfen uygulamanın (veya tarayıcının) kamera erişim izni olduğuna emin olun. Ayarlar -> Uygulamalar -> İzinler bölümünden kontrol edebilirsiniz.');
    }
}

// Kamerayı Tamamen Durdur ve Belleği Temizle
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => {
            track.stop();
        });
        camera.srcObject = null;
        stream = null;
    }
}

// Kamera Başlat (WebRTC)
takePhotoBtn.addEventListener('click', () => {
    startCamera();
});

// Fotoğraf Çek (WebRTC)
captureBtn.addEventListener('click', () => {
    if (!stream) return;

    // Kameradaki görüntüyü canvas'a çizdir
    const context = canvas.getContext('2d');
    canvas.width = camera.videoWidth;
    canvas.height = camera.videoHeight;
    context.drawImage(camera, 0, 0, canvas.width, canvas.height);

    // Canvas'ı resme çevir
    currentPhoto = canvas.toDataURL('image/jpeg', 0.8);
    previewImg.src = currentPhoto;

    // Kamerayı durdur, stream'i sıfırla (ikinci açılışa hazırla)
    stopCamera();

    // Arayüzü güncelle
    camera.classList.add('hidden');
    captureBtn.classList.add('hidden');
    photoPreview.classList.remove('hidden');
    retakeBtn.classList.remove('hidden');
});

// Yeniden Çek (Ortak)
retakeBtn.addEventListener('click', () => {
    // Fotoğrafı sil
    currentPhoto = null;
    photoPreview.classList.add('hidden');
    retakeBtn.classList.add('hidden');
    
    // Doğrudan kamerayı yeniden tetikle
    startCamera();
});

// Form Gönder - Firebase'e Kaydet
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentPhoto) {
        alert('Lütfen önce fotoğraf çekin!');
        return;
    }

    if (!selectedDate) {
        alert('Lütfen tarih seçin!');
        return;
    }

    try {
        // Fotoğrafı Storage'a yükle
        const photoBlob = await fetch(currentPhoto).then(r => r.blob());
        const fileName = `photos/${currentUser.uid}/${Date.now()}.jpg`;
        const storageRef = storage.ref(fileName);
        await storageRef.put(photoBlob);
        const photoURL = await storageRef.getDownloadURL();

        // Firestore'a kaydet
        await db.collection('photos').add({
            userId: currentUser.uid,
            userName: currentUser.displayName || currentUser.email,
            photoURL: photoURL,
            expiryDate: selectedDate,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Formu temizle
        currentPhoto = null;
        selectedDate = null;
        photoPreview.classList.add('hidden');
        retakeBtn.classList.add('hidden');
        takePhotoBtn.classList.remove('hidden');
        document.querySelectorAll('.calendar-btn').forEach(b => b.classList.remove('selected'));
        selectedDateInput.value = '';

        alert('✅ Fotoğraf kaydedildi!');
        loadDates();
    } catch (error) {
        console.error('Kayıt hatası:', error);
        alert('Hata: ' + error.message);
    }
});

// Tarihleri Yükle (Gerçek Zamanlı)
function loadDates() {
    db.collection('photos')
        .orderBy('expiryDate', 'asc')
        .onSnapshot((snapshot) => {
            const photosByDate = {};

            snapshot.forEach((doc) => {
                const data = doc.data();
                const dateKey = data.expiryDate;

                if (!photosByDate[dateKey]) {
                    photosByDate[dateKey] = [];
                }

                photosByDate[dateKey].push({
                    id: doc.id,
                    ...data
                });
            });

            renderDateList(photosByDate);
            // SKT Uyarısı (In-App Notification) Kontrolü
            checkExpiringProducts(photosByDate);
        }, (error) => {
            console.error('Firebase okuma hatası:', error);
            if (error.code === 'permission-denied') {
                dateList.innerHTML = '<p class="empty-message" style="color: #ef4444;">⚠️ Firebase erişim hatası!<br><br>Güvenlik kurallarının süresi dolmuş olabilir.<br>Lütfen FIREBASE_GUVENLIK_KURALLARI.md dosyasındaki talimatları takip edin.</p>';
            }
        });
}

// In-App Hatırlatıcı Paneli Analizi
function checkExpiringProducts(photosByDate) {
    let expiredItems = 0;
    let urgentItems = 0;

    // Önceki pulse (uyarı) animasyonlarını takvimden temizle
    document.querySelectorAll('.calendar-btn.pulse-alert').forEach(btn => {
        btn.classList.remove('pulse-alert');
    });

    Object.keys(photosByDate).forEach(dateKey => {
        const daysLeft = getDaysUntilExpiry(dateKey);
        const itemCount = photosByDate[dateKey].length;

        if (daysLeft < 0) {
            expiredItems += itemCount;
            // Tarihi geçen takvim butonunu kırmızı yak
            const btn = document.querySelector(`.calendar-btn[data-date="${dateKey}"]`);
            if (btn) btn.classList.add('pulse-alert');
        } else if (daysLeft <= 3) {
            urgentItems += itemCount;
            // SKT'si yaklaşan takvim butonunu kırmızı yak
            const btn = document.querySelector(`.calendar-btn[data-date="${dateKey}"]`);
            if (btn) btn.classList.add('pulse-alert');
        }
    });

    const dashboard = document.getElementById('alert-dashboard');
    const alertDesc = document.getElementById('alert-desc');

    if (expiredItems > 0 || urgentItems > 0) {
        dashboard.classList.remove('hidden');
        let descRows = [];
        
        if (expiredItems > 0) {
            descRows.push(`🚨 <strong>${expiredItems}</strong> ürünün tarihi GEÇTİ!`);
        }
        if (urgentItems > 0) {
            descRows.push(`⚠️ <strong>${urgentItems}</strong> ürünün bitmesine 3 günden az kaldı.`);
        }
        
        alertDesc.innerHTML = descRows.join('<br>');
        
        // Tıklanınca ürün listelerine (aşağıya) kaydır
        dashboard.onclick = () => {
            document.getElementById('date-list').scrollIntoView({ behavior: 'smooth' });
        };
    } else {
        // Uyarı yoksa paneli gizle
        dashboard.classList.add('hidden');
    }
}

// Tarih Listesini Göster
function renderDateList(photosByDate) {
    photosContainer.classList.add('hidden');

    const dates = Object.keys(photosByDate).sort();

    if (dates.length === 0) {
        dateList.innerHTML = '<p class="empty-message">Henüz fotoğraf eklenmedi.</p>';
        return;
    }

    dateList.innerHTML = dates.map(dateKey => {
        const photos = photosByDate[dateKey];
        const daysLeft = getDaysUntilExpiry(dateKey);
        const status = getDateStatus(daysLeft);

        return `
            <div class="date-card ${status.class}" onclick="showPhotos('${dateKey}')">
                <div class="date-info">
                    <h3>${formatDate(dateKey)}</h3>
                    <p>${status.text}</p>
                </div>
                <div class="photo-count">${photos.length} Fotoğraf</div>
            </div>
        `;
    }).join('');
}

// Belirli Bir Tarihin Fotoğraflarını Göster
async function showPhotos(dateKey) {
    const snapshot = await db.collection('photos')
        .where('expiryDate', '==', dateKey)
        .get();

    const photos = [];
    snapshot.forEach(doc => {
        photos.push({ id: doc.id, ...doc.data() });
    });

    dateList.style.display = 'none';
    photosContainer.classList.remove('hidden');
    selectedDateTitle.textContent = formatDate(dateKey);
    deleteAllBtn.dataset.date = dateKey;

    photosGrid.innerHTML = photos.map(photo => `
        <div class="photo-item">
            <img src="${photo.photoURL}" alt="Ürün fotoğrafı">
            <div class="photo-user">👤 ${photo.userName}</div>
            <button class="photo-delete" onclick="deletePhoto('${photo.id}', '${photo.photoURL}')">×</button>
        </div>
    `).join('');
}

// Geri Butonu
backBtn.addEventListener('click', () => {
    dateList.style.display = 'grid';
    photosContainer.classList.add('hidden');
});

// Tek Fotoğraf Sil
async function deletePhoto(photoId, photoURL) {
    if (confirm('Bu fotoğrafı silmek istediğinizden emin misiniz?')) {
        try {
            // Storage'dan sil
            const photoRef = storage.refFromURL(photoURL);
            await photoRef.delete();

            // Firestore'dan sil
            await db.collection('photos').doc(photoId).delete();

            alert('✅ Fotoğraf silindi!');

            // Listeyi güncelle
            const dateKey = deleteAllBtn.dataset.date;
            showPhotos(dateKey);
        } catch (error) {
            console.error('Silme hatası:', error);
            alert('Hata: ' + error.message);
        }
    }
}

// Tüm Tarihi Sil
deleteAllBtn.addEventListener('click', async () => {
    const dateKey = deleteAllBtn.dataset.date;

    if (confirm(`${formatDate(dateKey)} tarihindeki TÜM fotoğrafları silmek istediğinizden emin misiniz?`)) {
        try {
            const snapshot = await db.collection('photos')
                .where('expiryDate', '==', dateKey)
                .get();

            const batch = db.batch();
            const deletePromises = [];

            snapshot.forEach(doc => {
                const data = doc.data();

                // Storage'dan sil
                const photoRef = storage.refFromURL(data.photoURL);
                deletePromises.push(photoRef.delete());

                // Firestore'dan sil
                batch.delete(doc.ref);
            });

            await Promise.all(deletePromises);
            await batch.commit();

            alert('✅ Tüm fotoğraflar silindi!');

            // Ana listeye dön
            dateList.style.display = 'grid';
            photosContainer.classList.add('hidden');
        } catch (error) {
            console.error('Silme hatası:', error);
            alert('Hata: ' + error.message);
        }
    }
});

// ==================== YARDIMCI FONKSİYONLAR ====================

function getDaysUntilExpiry(dateKey) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(dateKey);
    expiry.setHours(0, 0, 0, 0);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

function getDateStatus(daysLeft) {
    if (daysLeft < 0) {
        return { class: 'urgent', text: '⚠️ Tarihi geçmiş!' };
    } else if (daysLeft === 0) {
        return { class: 'urgent', text: '🔴 Bugün son gün!' };
    } else if (daysLeft === 1) {
        return { class: 'urgent', text: '🔴 Yarın son gün!' };
    } else if (daysLeft <= 3) {
        return { class: 'warning', text: `⚠️ ${daysLeft} gün kaldı` };
    } else {
        return { class: 'ok', text: `✅ ${daysLeft} gün kaldı` };
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// ==================== BİLDİRİMLER ====================

enableNotificationsBtn.addEventListener('click', async () => {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        notificationPrompt.classList.add('hidden');
        alert('✅ Bildirimler açıldı!');
    }
});

async function checkNotifications() {
    if (Notification.permission !== 'granted') {
        notificationPrompt.classList.remove('hidden');
        return;
    }

    const snapshot = await db.collection('photos').get();

    snapshot.forEach(doc => {
        const data = doc.data();
        const daysLeft = getDaysUntilExpiry(data.expiryDate);

        if (daysLeft === 1) {
            const notificationKey = `notified-${doc.id}`;
            if (!localStorage.getItem(notificationKey)) {
                new Notification('⚠️ STK Ürün Uyarısı', {
                    body: `${formatDate(data.expiryDate)} tarihli ürünler yarın son kullanma tarihine ulaşıyor!`,
                    tag: doc.id
                });
                localStorage.setItem(notificationKey, 'true');
            }
        }
    });
}

// Her saat başı bildirimleri kontrol et
setInterval(checkNotifications, 60 * 60 * 1000);
