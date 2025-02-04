// Kullanıcı yönetimi ve veri depolama
let currentImages = [];
let currentNotes = [];
let currentImageIndex = 0;
let likes = new Map();
let comments = new Map();

// Desteklenen resim formatları
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/heic', 'image/heif'];

// GitHub yapılandırması
const GITHUB_TOKEN = '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'; // GitHub'dan alacağınız token
const REPO_OWNER = 'imlosingbut2you';
const REPO_NAME = 'imlosingbut2you.github.io';
const POSTS_FILE = 'posts.json';

// Kullanıcı bilgileri
const USERS = {
    '108': {
        id: '108',
        name: 'Nida'
    },
    '66': {
        id: '66',
        name: 'Mert'
    }
};

// Kullanıcı şifreleri
const HASHED_PASSWORDS = {
    '108': {
        id: '108',
        name: 'Nida'
    },
    '666': {
        id: '66',
        name: 'Mert'
    }
};

let currentUser = null;

// Oturum kontrolü
window.addEventListener('load', function() {
    const sessionKey = sessionStorage.getItem('sessionKey');
    const userId = sessionStorage.getItem('userId');
    
    if (sessionKey && userId) {
        currentUser = USERS[userId];
        if (currentUser) {
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('content').style.display = 'block';
            loadPosts();
        }
    }
});

// Arama çubuğunu göster/gizle
function toggleSearch() {
    const searchBar = document.getElementById('searchBar');
    const isHidden = searchBar.style.display === 'none';
    
    searchBar.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
        searchBar.classList.add('active');
        document.getElementById('searchInput').focus();
    }
}

// Notlarda arama yap
function searchNotes() {
    const searchText = document.getElementById('searchInput').value.toLowerCase();
    const posts = document.querySelectorAll('.post');
    
    posts.forEach(post => {
        const text = post.querySelector('p').textContent.toLowerCase();
        post.style.display = text.includes(searchText) ? 'block' : 'none';
    });
}

// Karakter sayısını güncelle
function updateCharCount() {
    const text = document.getElementById('noteText').value;
    const charCount = document.querySelector('.char-count');
    charCount.textContent = `${text.length} karakter`;
}

// Not yazma alanına karakter sayacı ekle
document.getElementById('noteText').addEventListener('input', updateCharCount);

// Şifreleme için gerekli fonksiyonlar
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

// GitHub'a kaydedilecek verileri şifrele
async function encryptData(data, key) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(JSON.stringify(data));
    
    // Rastgele IV (Initialization Vector) oluştur
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Şifreleme anahtarını oluştur
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(key),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    
    const encryptionKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: new Uint8Array(16),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt']
    );
    
    // Veriyi şifrele
    const encryptedData = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        encryptionKey,
        encodedData
    );
    
    // Şifrelenmiş veriyi ve IV'yi birleştir
    const result = new Uint8Array(iv.length + encryptedData.byteLength);
    result.set(iv);
    result.set(new Uint8Array(encryptedData), iv.length);
    
    return btoa(String.fromCharCode.apply(null, result));
}

// GitHub'dan alınan verileri deşifrele
async function decryptData(encryptedData, key) {
    const decoder = new TextDecoder();
    const data = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
    
    // IV'yi ayır
    const iv = data.slice(0, 12);
    const encryptedContent = data.slice(12);
    
    // Şifreleme anahtarını oluştur
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(key),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    
    const decryptionKey = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: new Uint8Array(16),
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['decrypt']
    );
    
    // Veriyi deşifrele
    const decryptedData = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        decryptionKey,
        encryptedContent
    );
    
    return JSON.parse(decoder.decode(decryptedData));
}

// Giriş fonksiyonu
async function login() {
    const password = document.getElementById('password').value;
    const user = HASHED_PASSWORDS[password];
    
    if (user) {
        currentUser = user;
        // Güvenli bir session key oluştur
        const sessionKey = crypto.getRandomValues(new Uint8Array(32))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
        
        // Session key'i güvenli bir şekilde sakla
        sessionStorage.setItem('sessionKey', sessionKey);
        sessionStorage.setItem('userId', user.id);
        
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('content').style.display = 'block';
        loadPosts();
    } else {
        alert('Yanlış şifre!');
    }
}

// Kayıt fonksiyonu
async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        await auth.createUserWithEmailAndPassword(email, password);
        // Başarılı kayıt
    } catch (error) {
        alert('Kayıt hatası: ' + error.message);
    }
}

// Resim önizleme fonksiyonu
function previewImages() {
    const input = document.getElementById('imageInput');
    const files = Array.from(input.files);
    
    if (files.length > 0) {
        currentImages = files;
    }
}

function displayCurrentImage() {
    if (currentImages.length === 0) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.createElement('img');
        img.src = e.target.result;
        document.getElementById('imagePreviews').innerHTML = '';
        document.getElementById('imagePreviews').appendChild(img);
    };
    reader.readAsDataURL(currentImages[currentImageIndex]);
}

function addNote() {
    const notesList = document.getElementById('notesList');
    const noteItem = document.createElement('div');
    noteItem.className = 'note-item';
    noteItem.innerHTML = `
        <textarea placeholder="Not ekle..." rows="2"></textarea>
        <button class="delete-note" onclick="deleteNote(this)">
            <i class="fas fa-times"></i>
        </button>
    `;
    notesList.appendChild(noteItem);
    updateNoteCount();
}

function deleteNote(button) {
    button.parentElement.remove();
    updateNoteCount();
}

function updateNoteCount() {
    const count = document.querySelectorAll('.note-item').length;
    document.querySelector('.note-count').textContent = `${count} not`;
}

function deleteCurrentImage() {
    if (currentImages.length === 0) return;
    
    currentImages.splice(currentImageIndex, 1);
    if (currentImageIndex >= currentImages.length) {
        currentImageIndex = Math.max(0, currentImages.length - 1);
    }
    
    displayCurrentImage();
    document.querySelector('.image-count').textContent = `${currentImages.length} fotoğraf`;
}

function likePost(postId) {
    const button = document.querySelector(`#post-${postId} .post-action.like`);
    const likesCount = document.querySelector(`#post-${postId} .post-likes`);
    const currentLikes = likes.get(postId) || 0;
    
    if (button.classList.contains('liked')) {
        button.classList.remove('liked');
        likes.set(postId, currentLikes - 1);
    } else {
        button.classList.add('liked');
        likes.set(postId, currentLikes + 1);
    }
    
    likesCount.textContent = `${likes.get(postId)} beğenme`;
}

function addComment(postId) {
    const input = document.querySelector(`#post-${postId} .comment-input`);
    const comment = input.value.trim();
    if (!comment) return;
    
    const postComments = comments.get(postId) || [];
    postComments.push({
        username: 'Kullanıcı',
        text: comment
    });
    comments.set(postId, postComments);
    
    input.value = '';
    displayComments(postId);
}

function displayComments(postId) {
    const commentsContainer = document.querySelector(`#post-${postId} .post-comments`);
    const postComments = comments.get(postId) || [];
    
    commentsContainer.innerHTML = postComments.map(comment => `
        <div class="comment">
            <span class="comment-username">${comment.username}</span>
            <span class="comment-text">${comment.text}</span>
        </div>
    `).join('');
}

// Gönderi paylaşma modalını aç
function openShareModal() {
    document.getElementById('shareModal').style.display = 'block';
}

// Gönderi paylaşma modalını kapat
function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
}

// Paylaşım formunu göster
function showShareForm(type) {
    closeShareModal();
    if (type === 'photo') {
        document.getElementById('photoForm').style.display = 'block';
    } else if (type === 'note') {
        document.getElementById('noteForm').style.display = 'block';
    }
}

// Fotoğraf formu kapat
function closePhotoForm() {
    document.getElementById('photoForm').style.display = 'none';
}

// Not formu kapat
function closeNoteForm() {
    document.getElementById('noteForm').style.display = 'none';
}

// Fotoğraf gönderisi paylaş
async function sharePhotoPost() {
    if (!currentUser) {
        alert('Lütfen önce giriş yapın!');
        return;
    }

    const caption = document.getElementById('photoCaption').value;
    const imageInput = document.getElementById('imageInput');
    const file = imageInput.files[0];

    if (!file) {
        alert('Lütfen bir fotoğraf seçin');
        return;
    }

    try {
        // Fotoğrafı base64'e çevir
        const base64Image = await convertImageToBase64(file);
        
        // Mevcut gönderileri al
        const posts = await getPostsFromGitHub();
        
        // Yeni gönderiyi ekle
        const newPost = {
            id: Date.now(),
            type: 'photo',
            userId: currentUser.id,
            images: [base64Image],
            caption: caption,
            timestamp: new Date().toISOString(),
            likes: 0,
            likedBy: [],
            comments: []
        };
        
        posts.unshift(newPost);
        
        // GitHub'a kaydet
        await savePostsToGitHub(posts);
        
        closePhotoForm();
        document.getElementById('photoCaption').value = '';
        imageInput.value = '';
        loadPosts();
    } catch (error) {
        alert('Paylaşım hatası: ' + error.message);
    }
}

// Not gönderisi paylaş
async function shareNotePost() {
    if (!currentUser) {
        alert('Lütfen önce giriş yapın!');
        return;
    }

    const noteText = document.getElementById('noteText').value;
    if (!noteText.trim()) {
        alert('Lütfen bir not yazın');
        return;
    }

    try {
        // Mevcut gönderileri al
        const posts = await getPostsFromGitHub();
        
        // Yeni gönderiyi ekle
        const newPost = {
            id: Date.now(),
            type: 'note',
            userId: currentUser.id,
            text: noteText,
            timestamp: new Date().toISOString(),
            likes: 0,
            likedBy: [],
            comments: []
        };
        
        posts.unshift(newPost);
        
        // GitHub'a kaydet
        await savePostsToGitHub(posts);

        closeNoteForm();
        document.getElementById('noteText').value = '';
        loadPosts();
    } catch (error) {
        alert('Paylaşım hatası: ' + error.message);
    }
}

// Gönderileri yükle
async function loadPosts() {
    const postsDiv = document.getElementById('posts');
    postsDiv.innerHTML = '';

    try {
        const posts = await getPostsFromGitHub();
        
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.className = 'post';
            postElement.id = `post-${post.id}`;
            
            const user = USERS[post.userId];
            if (!user) return;

            if (post.type === 'photo') {
                postElement.innerHTML = `
                    <div class="post-header">
                        <div class="post-user">
                            <span class="post-username">${user.name}</span>
                        </div>
                    </div>
                    <div class="post-image" ondblclick="handleDoubleTap(${post.id}, this)">
                        <img src="data:image/jpeg;base64,${post.images[0]}" alt="Post">
                        <div class="double-tap-heart">
                            <i class="fas fa-heart"></i>
                        </div>
                    </div>
                    <div class="post-actions">
                        <button onclick="toggleLike(${post.id})" class="post-action like ${post.likedBy?.includes(currentUser.id) ? 'liked' : ''}">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button onclick="toggleComment(${post.id})" class="post-action">
                            <i class="fas fa-comment"></i>
                        </button>
                    </div>
                    <div class="post-likes">${formatLikes(post.likedBy)}</div>
                    ${post.caption ? `<p class="post-caption"><span class="comment-username">${user.name}</span> ${post.caption}</p>` : ''}
                    <div class="post-comments">
                        ${(post.comments || []).map(comment => {
                            const commentUser = USERS[comment.userId];
                            if (!commentUser) return '';
                            return `
                                <div class="comment">
                                    <span class="comment-username">${commentUser.name}</span>
                                    <span class="comment-text">${comment.text}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="add-comment" id="comment-${post.id}">
                        <input type="text" class="comment-input" placeholder="Yorum ekle..." onkeypress="handleCommentInput(event, ${post.id})">
                    </div>
                    <span class="post-time">${formatDate(post.timestamp)}</span>
                `;
            } else if (post.type === 'note') {
                postElement.innerHTML = `
                    <div class="post-header">
                        <div class="post-user">
                            <span class="post-username">${user.name}</span>
                        </div>
                    </div>
                    <div class="post-content">
                        <div class="note-text">${post.text}</div>
                    </div>
                    <div class="post-actions">
                        <button onclick="toggleLike(${post.id})" class="post-action like ${post.likedBy?.includes(currentUser.id) ? 'liked' : ''}">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button onclick="toggleComment(${post.id})" class="post-action">
                            <i class="fas fa-comment"></i>
                        </button>
                    </div>
                    <div class="post-likes">${formatLikes(post.likedBy)}</div>
                    <div class="post-comments">
                        ${(post.comments || []).map(comment => {
                            const commentUser = USERS[comment.userId];
                            if (!commentUser) return '';
                            return `
                                <div class="comment">
                                    <span class="comment-username">${commentUser.name}</span>
                                    <span class="comment-text">${comment.text}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="add-comment" id="comment-${post.id}">
                        <input type="text" class="comment-input" placeholder="Yorum ekle..." onkeypress="handleCommentInput(event, ${post.id})">
                    </div>
                    <span class="post-time">${formatDate(post.timestamp)}</span>
                `;
            }

            postsDiv.appendChild(postElement);
        });
    } catch (error) {
        console.error('Gönderiler yüklenirken hata:', error);
    }
}

// Resmi optimize et
async function optimizeImage(base64String) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            let width = img.width;
            let height = img.height;
            
            // iPhone resimlerinin EXIF rotasyonunu düzelt
            if (height > width && base64String.includes('image/jpeg')) {
                // Resmin orijinal oryantasyonunu koru
                const temp = width;
                width = height;
                height = temp;
            }
            
            // Sadece çok büyük resimleri küçült (4K'dan büyükse)
            const maxDimension = 3840; // 4K
            if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                    height = Math.round(height * (maxDimension / width));
                    width = maxDimension;
                } else {
                    width = Math.round(width * (maxDimension / height));
                    height = maxDimension;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Görüntü kalitesini artırmak için smoothing uygula
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // iPhone resimlerinin EXIF rotasyonunu düzelt
            if (height > width && base64String.includes('image/jpeg')) {
                ctx.translate(width, 0);
                ctx.rotate(90 * Math.PI / 180);
            }
            
            // Resmi çiz
            ctx.drawImage(img, 0, 0, width, height);
            
            // PNG olarak kaydet (kayıpsız sıkıştırma)
            if (base64String.includes('image/png')) {
                resolve(canvas.toDataURL('image/png'));
            } else {
                // JPEG için yüksek kalite
                resolve(canvas.toDataURL('image/jpeg', 0.95));
            }
        };
        img.src = base64String;
    });
}

// Sayfa yönetimi
function showPage(pageId) {
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    document.getElementById(pageId).classList.add('active');
    
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    document.querySelector(`[onclick="showPage('${pageId}')"]`).classList.add('active');
}

function showNewPostForm() {
    document.querySelector('.new-post').style.display = 'block';
    document.querySelector('.posts').style.display = 'none';
}

function showReels() {
    alert('Reels özelliği yakında eklenecek!');
}

// Profil sayfası işlevleri
function updateProfileStats() {
    const posts = document.querySelectorAll('.post').length;
    document.querySelector('.stat-value').textContent = posts;
}

// Hikaye ekleme
function addStory() {
    alert('Hikaye ekleme özelliği yakında eklenecek!');
}

// Profil sekmelerini göster/gizle
function showProfileTab(tabName) {
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`${tabName}Tab`).classList.add('active');
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`[onclick="showProfileTab('${tabName}')"]`).classList.add('active');
}

function resetForm() {
    document.getElementById('photoCaption').value = '';
    document.getElementById('imageInput').value = '';
    currentImages = [];
    currentImageIndex = 0;
    document.querySelector('.image-count').textContent = '0 fotoğraf';
}

function formatLikes(likedBy) {
    if (!likedBy || likedBy.length === 0) return '';
    
    const likers = likedBy.map(userId => USERS[userId]?.name).filter(name => name);
    
    if (likers.length === 0) return '';
    if (likers.length === 1) return `${likers[0]} beğendi`;
    if (likers.length === 2) return `${likers[0]} ve ${likers[1]} beğendi`;
    return `${likers[0]}, ${likers[1]} ve ${likers.length - 2} kişi daha beğendi`;
}

function loadUserPosts(userId) {
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const photosContainer = document.querySelector('.profile-posts');
    const notesContainer = document.querySelector('.profile-notes');
    
    photosContainer.innerHTML = '';
    notesContainer.innerHTML = '';
    
    const userPosts = posts.filter(post => post.userId === userId);
    
    userPosts.forEach(post => {
        if (post.type === 'photo') {
            const photoElement = document.createElement('div');
            photoElement.className = 'profile-post';
            photoElement.innerHTML = `
                <div class="profile-post-image" onclick="showPhotoModal(${post.id})">
                    <img src="${post.images[0]}" alt="Post">
                    <div class="profile-post-overlay">
                        <div class="profile-post-stats">
                            <span><i class="fas fa-heart"></i> ${post.likes || 0}</span>
                            <span><i class="fas fa-comment"></i> ${(post.comments || []).length}</span>
                        </div>
                    </div>
                </div>
            `;
            photosContainer.appendChild(photoElement);
        } else {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item';
            noteElement.innerHTML = `
                <p class="note-text">${post.text}</p>
                <span class="note-time">${formatDate(post.timestamp)}</span>
            `;
            notesContainer.appendChild(noteElement);
        }
    });
}

function formatDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 60) {
        return `${minutes} dakika önce`;
    } else if (hours < 24) {
        return `${hours} saat önce`;
    } else {
        return `${days} gün önce`;
    }
}

function toggleLike(postId) {
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const post = posts.find(p => p.id === postId);
    
    if (post) {
        if (!post.likedBy) {
            post.likedBy = [];
        }
        
        const likeIndex = post.likedBy.indexOf(currentUser.id);
        if (likeIndex === -1) {
            post.likedBy.push(currentUser.id);
            post.likes = (post.likes || 0) + 1;
        } else {
            post.likedBy.splice(likeIndex, 1);
            post.likes = (post.likes || 0) - 1;
        }
        
        localStorage.setItem('posts', JSON.stringify(posts));
        loadPosts();
    }
}

function toggleComment(postId) {
    const commentSection = document.getElementById(`comment-${postId}`);
    const isVisible = commentSection.classList.contains('show');
    
    document.querySelectorAll('.add-comment').forEach(section => {
        section.classList.remove('show');
    });
    
    if (!isVisible) {
        commentSection.classList.add('show');
        const input = commentSection.querySelector('.comment-input');
        input.focus();
        
        setTimeout(() => {
            input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    }
}

function handleCommentInput(event, postId) {
    if (event.key === 'Enter') {
        const commentText = event.target.value.trim();
        if (commentText) {
            addComment(postId, commentText);
            event.target.value = '';
        }
    }
}

function addComment(postId, commentText) {
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const post = posts.find(p => p.id === postId);
    
    if (post) {
        if (!post.comments) {
            post.comments = [];
        }
        post.comments.push({
            userId: currentUser.id,
            text: commentText,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('posts', JSON.stringify(posts));
        loadPosts();
    }
}

function focusComment(postId) {
    const post = document.querySelector(`.post:has([onclick="toggleLike(${postId})"])`);
    if (post) {
        const input = post.querySelector('.comment-input');
        input.focus();
    }
}

// Test verilerini güncelle
async function addTestData() {
    const testPosts = [
        {
            id: Date.now() - 5000,
            type: 'photo',
            userId: '108', // Nida
            images: ['iVBORw0KGgoAAAANSUhEUgAAAZAAAAGQAQMAAAC6caSPAAAAA1BMVEWpqamhxZfmAAAASElEQVR42uzBgQAAAACAoP2pF6kCAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIDZA6cAAAGZtPdZAAAAAElFTkSuQmCC'],
            caption: 'Güzel bir gün 🌞',
            timestamp: new Date(Date.now() - 5000).toISOString(),
            likes: 2,
            likedBy: ['66'],
            comments: [
                {
                    userId: '66',
                    text: 'Harika görünüyor! 😍',
                    timestamp: new Date(Date.now() - 4800).toISOString()
                }
            ]
        },
        {
            id: Date.now() - 4500,
            type: 'note',
            userId: '66', // Mert
            text: 'Yeni kameramla çektiğim fotoğrafları yakında paylaşacağım! 📸',
            timestamp: new Date(Date.now() - 4500).toISOString(),
            likes: 1,
            likedBy: ['108'],
            comments: [
                {
                    userId: '108',
                    text: 'Heyecanla bekliyorum! 🤩',
                    timestamp: new Date(Date.now() - 4400).toISOString()
                }
            ]
        }
    ];

    try {
        await savePostsToGitHub(testPosts);
        loadPosts();
    } catch (error) {
        console.error('Test verileri yüklenemedi:', error);
    }
}

// Sayfa yüklendiğinde test verilerini ekle
window.addEventListener('load', addTestData);

function handleDoubleTap(postId, imageContainer) {
    const heart = imageContainer.querySelector('.double-tap-heart');
    heart.classList.add('show');
    
    setTimeout(() => {
        heart.classList.remove('show');
    }, 1000);
    
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const post = posts.find(p => p.id === postId);
    
    if (post && !post.likedBy?.includes(currentUser.id)) {
        toggleLike(postId);
    }
}

function showPhotoModal(postId) {
    const posts = JSON.parse(localStorage.getItem('posts') || '[]');
    const post = posts.find(p => p.id === postId);
    
    if (!post) return;
    
    const user = USERS[post.userId];
    if (!user) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal photo-modal';
    modal.innerHTML = `
        <div class="modal-content photo-modal-content">
            <div class="modal-header">
                <div class="post-user" onclick="showUserProfile('${user.id}')">
                    <span class="post-username">${user.name}</span>
                </div>
                <button onclick="closePhotoModal(this)" class="close-button">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="photo-modal-body">
                <div class="photo-container" ondblclick="handleDoubleTap(${post.id}, this)">
                    <img src="${post.images[0]}" alt="Post">
                    <div class="double-tap-heart">
                        <i class="fas fa-heart"></i>
                    </div>
                </div>
                <div class="photo-details">
                    <div class="post-actions">
                        <button onclick="toggleLike(${post.id})" class="post-action like ${post.likedBy?.includes(currentUser.id) ? 'liked' : ''}">
                            <i class="fas fa-heart"></i>
                        </button>
                        <button onclick="focusComment(${post.id})" class="post-action">
                            <i class="fas fa-comment"></i>
                        </button>
                    </div>
                    <div class="post-likes">${formatLikes(post.likedBy)}</div>
                    ${post.caption ? `<p class="post-caption"><span class="comment-username">${user.name}</span> ${post.caption}</p>` : ''}
                    <div class="post-comments">
                        ${(post.comments || []).map(comment => {
                            const commentUser = USERS[comment.userId];
                            if (!commentUser) return '';
                            return `
                                <div class="comment">
                                    <span class="comment-username">${commentUser.name}</span>
                                    <span class="comment-text">${comment.text}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="add-comment" id="comment-${post.id}">
                        <input type="text" class="comment-input" placeholder="Yorum ekle..." onkeypress="handleCommentInput(event, ${post.id})">
                    </div>
                    <span class="post-time">${formatDate(post.timestamp)}</span>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Modal animasyonunu başlat
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Modal açıldığında scroll'u engelle
    document.body.style.overflow = 'hidden';
}

function closePhotoModal(button) {
    const modal = button.closest('.photo-modal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.remove();
        // Modal kapandığında scroll'u geri aç
        document.body.style.overflow = '';
    }, 300);
}

// Giriş formunu ortala
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.style.position = 'fixed';
        loginForm.style.top = '50%';
        loginForm.style.left = '50%';
        loginForm.style.transform = 'translate(-50%, -50%)';
    }
});

// Base64'e çevir
async function convertImageToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// GitHub'dan gönderileri al
async function getPostsFromGitHub() {
    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_FILE}`, {
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (response.status === 404) return [];
        
        const data = await response.json();
        if (data.content) {
            const decodedContent = atob(data.content);
            return JSON.parse(decodedContent);
        }
        return [];
    } catch (error) {
        console.error('GitHub\'dan veriler alınamadı:', error);
        return [];
    }
}

// GitHub'a gönderileri kaydet
async function savePostsToGitHub(posts) {
    try {
        // Mevcut dosyayı kontrol et
        let sha;
        try {
            const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_FILE}`, {
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (response.ok) {
                const data = await response.json();
                sha = data.sha;
            }
        } catch (error) {
            console.log('Dosya henüz yok, yeni oluşturulacak');
        }

        // Veriyi GitHub'a kaydet
        const content = btoa(JSON.stringify(posts, null, 2));
        const body = {
            message: 'Gönderiler güncellendi',
            content: content,
            ...(sha && { sha })
        };

        const updateResponse = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${POSTS_FILE}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body)
        });

        if (!updateResponse.ok) {
            throw new Error('GitHub\'a kayıt başarısız');
        }
    } catch (error) {
        console.error('GitHub\'a kaydedilemedi:', error);
        alert('Paylaşım kaydedilemedi, lütfen tekrar deneyin.');
        throw error;
    }
} 