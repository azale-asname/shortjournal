document.addEventListener("DOMContentLoaded", function() {
    const modal = document.getElementById("storyModal");
    const openBtn = document.getElementById("openModalBtn");
    const closeBtn = document.querySelector(".close-btn");
    const storyForm = document.getElementById("storyForm");
    const storiesContainer = document.getElementById("storiesContainer");
    const editStoryIdInput = document.getElementById("editStoryId");

    // ==========================================
    // CONFIG DATABASE SUPABASE (GANTI DI SINI!)
    // ==========================================
    const SUPABASE_URL = "https://zrwclfgzdoewicifsqnr.supabase.co"; 
    const SUPABASE_ANON_KEY = "sb_publishable_EH-9vZiLzMT3YtLXaQUWlA_mDxJRyJG";

    const isAdminPage = window.location.pathname.includes("admin.html");

    function calculateReadingTime(text) {
        if (!text) return 1;
        const wordsPerMinute = 200;
        const numberOfWords = text.trim().split(/\s+/).length;
        return Math.ceil(numberOfWords / wordsPerMinute);
    }

    // 1. FUNGSI CLOUD: Ambil semua cerita dari Supabase Database
    async function loadStories() {
        try {
            // Nembak API Supabase buat ambil data diurutkan dari yang paling baru (id desc)
            const response = await fetch(`${SUPABASE_URL}/rest/v1/stories?select=*&order=id.desc`, {
                method: "GET",
                headers: {
                    "apikey": SUPABASE_ANON_KEY,
                    "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                }
            });
            
            const savedStories = await response.json();
            
            if (!savedStories || savedStories.length === 0) {
                storiesContainer.innerHTML = `<p class="no-stories-text" style="color: #475569; grid-column: 1/-1; text-align: center; font-style: italic; padding: 40px 0;">No stories published yet.</p>`;
                return;
            }

            storiesContainer.innerHTML = '';
            
            savedStories.forEach(story => {
                const readingTime = calculateReadingTime(story.content);
                const card = document.createElement("div");
                card.classList.add("story-card");
                
                const adminButtonsHtml = isAdminPage ? `
                    <button class="edit-story-btn" data-id="${story.id}" title="Edit Story">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18">
                            <path d="M5 19h1.4l8.6-8.6-1.4-1.4L5 17.6V19zm0 2a2 2 0 0 1-2-2v-3.4a2 2 0 0 1 .6-1.4L15.5 2.3a2 2 0 0 1 2.8 0l2.4 2.4a2 2 0 0 1 0 2.8L8.8 19.4a2 2 0 0 1-1.4.6H5v2zm14.6-15.4l-1.4-1.4 1.4-1.4 1.4 1.4-1.4 1.4z"/>
                        </svg>
                    </button>
                    <button class="delete-story-btn" data-id="${story.id}">&times;</button>
                ` : '';

                card.innerHTML = `
                    ${adminButtonsHtml}
                    <div class="card-tag">${story.genre}</div>
                    <h3>${story.title}</h3>
                    <p class="story-desc">${story.snippet}</p>
                    <div class="story-meta-info">
                        <a href="story.html?id=${story.id}" class="read-more" style="margin-top:0;">READ FULL STORY &rarr;</a>
                        <span style="color: #475569;">•</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14">
                            <path d="M12 2c5.52 0 10 4.48 10 10s-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2zm1 5h-2v6h5v-2h-3V7z"/>
                        </svg>
                        <span>${readingTime} min read</span>
                    </div>
                `;
                storiesContainer.appendChild(card);
            });

            if (isAdminPage) initAdminButtons();
        } catch (error) {
            console.error("Gagal mengambil data dari cloud:", error);
        }
    }

    loadStories();

    // 2. Navigasi Modal Popup Admin
    if (isAdminPage && openBtn && closeBtn) {
        openBtn.addEventListener("click", () => {
            storyForm.reset();
            editStoryIdInput.value = "";
            if(modal.querySelector("h3")) modal.querySelector("h3").innerText = "Create New Journal Entry";
            modal.style.display = "flex";
        });
        closeBtn.addEventListener("click", () => modal.style.display = "none");
        window.addEventListener("click", (e) => {
            if (e.target == modal) modal.style.display = "none";
        });
    }

    // 3. FUNGSI CLOUD: Kirim data baru ATAU update data lama ke Supabase
    if (isAdminPage && storyForm) {
        storyForm.addEventListener("submit", async function(e) {
            e.preventDefault();

            const genre = document.getElementById("storyGenre").value;
            const title = document.getElementById("storyTitle").value;
            const snippet = document.getElementById("storySnippet").value;
            const content = document.getElementById("storyContent").value;
            const bgUrl = document.getElementById("storyBg").value;
            const editId = editStoryIdInput.value;

            const storyData = { genre, title, snippet, content, bgUrl };

            try {
                if (editId) {
                    // MODE EDIT: Kirim perintah PATCH berdasarkan ID spesifik cerita
                    await fetch(`${SUPABASE_URL}/rest/v1/stories?id=eq.${editId}`, {
                        method: "PATCH",
                        headers: {
                            "apikey": SUPABASE_ANON_KEY,
                            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(storyData)
                    });
                } else {
                    // MODE BARU: Kirim perintah POST buat nambah baris baru di tabel cloud
                    await fetch(`${SUPABASE_URL}/rest/v1/stories`, {
                        method: "POST",
                        headers: {
                            "apikey": SUPABASE_ANON_KEY,
                            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify(storyData)
                    });
                }

                loadStories(); // Refresh grid secara real-time
                storyForm.reset();
                modal.style.display = "none";
            } catch (error) {
                console.error("Gagal menyimpan ke cloud:", error);
            }
        });
    }

    // 4. FUNGSI CLOUD: Logika Tombol Admin Hapus & Ambil Data Edit
    function initAdminButtons() {
        if (!isAdminPage) return;

        // Sistem Hapus di Cloud Database
        document.querySelectorAll(".delete-story-btn").forEach(button => {
            button.replaceWith(button.cloneNode(true));
        });
        document.querySelectorAll(".delete-story-btn").forEach(button => {
            button.addEventListener("click", async function() {
                const storyId = this.getAttribute("data-id");
                if (confirm("Apakah lu yakin mau menghapus cerita ini secara permanen dari Cloud?")) {
                    try {
                        // Kirim perintah DELETE ke Supabase sesuai ID target
                        await fetch(`${SUPABASE_URL}/rest/v1/stories?id=eq.${storyId}`, {
                            method: "DELETE",
                            headers: {
                                "apikey": SUPABASE_ANON_KEY,
                                "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                            }
                        });
                        loadStories();
                    } catch (error) {
                        console.error("Gagal menghapus data di cloud:", error);
                    }
                }
            });
        });

        // Sistem Ambil Data Edit dari Cloud
        document.querySelectorAll(".edit-story-btn").forEach(button => {
            button.replaceWith(button.cloneNode(true));
        });
        document.querySelectorAll(".edit-story-btn").forEach(button => {
            button.addEventListener("click", async function() {
                const storyId = this.getAttribute("data-id");
                try {
                    const response = await fetch(`${SUPABASE_URL}/rest/v1/stories?id=eq.${storyId}`, {
                        method: "GET",
                        headers: {
                            "apikey": SUPABASE_ANON_KEY,
                            "Authorization": `Bearer ${SUPABASE_ANON_KEY}`
                        }
                    });
                    const data = await response.json();
                    const targetStory = data[0];

                    if (targetStory) {
                        editStoryIdInput.value = targetStory.id;
                        document.getElementById("storyGenre").value = targetStory.genre;
                        document.getElementById("storyTitle").value = targetStory.title;
                        document.getElementById("storySnippet").value = targetStory.snippet;
                        document.getElementById("storyContent").value = targetStory.content;
                        document.getElementById("storyBg").value = targetStory.bgUrl || "";

                        if(modal.querySelector("h3")) modal.querySelector("h3").innerText = "Edit Journal Entry";
                        modal.style.display = "flex";
                    }
                } catch (error) {
                    console.error("Gagal mengambil data detail untuk edit:", error);
                }
            });
        });
    }
});