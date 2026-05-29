/**
 * Craving Kitchen - Full Menu, Cart & Database Live Review Engine
 * File: script.js
 */

// ⚠️ REPLACE THIS LINK WITH YOUR COPIED REALTIME DATABASE URL FROM FIREBASE Console:
const FIREBASE_DB_URL = "https://your-project-id.firebaseio.com/";

let cart = [];
let currentSelectedCoffee = null;
let selectedFlavour = "Regular";
let selectedAddonPrice = 0;

document.addEventListener('DOMContentLoaded', function() {
  
  // ==========================================
  // 1. DATABASE REVIEW LIVE STREAMING LOGIC
  // ==========================================
  const reviewForm = document.getElementById('reviewForm');
  const reviewsFeed = document.getElementById('reviewsFeed');

  // Load reviews from Firebase Database right away
  fetchLiveReviews();

  if (reviewForm) {
    reviewForm.addEventListener('submit', function(e) {
      e.preventDefault();
      
      const nameInput = document.getElementById('reviewName');
      const commentInput = document.getElementById('reviewComment');
      const submitBtn = document.getElementById('submitReviewBtn');

      const reviewData = {
        name: nameInput.value.trim(),
        comment: commentInput.value.trim(),
        timestamp: new Date().toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'
        })
      };

      // Safeguard configuration error
      if (FIREBASE_DB_URL.includes("your-project-id")) {
        alert("Please set up your custom Firebase Database link at the top of script.js first!");
        return;
      }

      submitBtn.innerText = "Posting...";
      submitBtn.disabled = true;

      // POST method sends data safely to Firebase
      fetch(`${FIREBASE_DB_URL}reviews.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reviewData)
      })
      .then(response => {
        if (!response.ok) throw new Error("Database Write Failed");
        return response.json();
      })
      .then(() => {
        commentInput.value = ""; // Clear input text box on successful post
        fetchLiveReviews(); // Refresh feed immediately
      })
      .catch(err => {
        console.error(err);
        alert("Couldn't save review. Make sure database rule is set to Public Test Mode.");
      })
      .finally(() => {
        submitBtn.innerText = "Submit Live Review";
        submitBtn.disabled = false;
      });
    });
  }

  function fetchLiveReviews() {
    if (FIREBASE_DB_URL.includes("your-project-id") || !reviewsFeed) return;

    fetch(`${FIREBASE_DB_URL}reviews.json`)
      .then(res => res.json())
      .then(data => {
        reviewsFeed.innerHTML = ""; // Clear loader placeholder element

        if (!data) {
          reviewsFeed.innerHTML = `<p style="text-align: center; color: #a4b0be; font-size: 13px; padding: 15px;">No reviews left yet. Be the first!</p>`;
          return;
        }

        // Convert object dataset into iterable ordered array lists
        const sortedReviews = Object.values(data).reverse();

        sortedReviews.forEach(item => {
          const reviewCard = document.createElement('div');
          reviewCard.className = 'user-review-card';
          reviewCard.innerHTML = `
            <div class="review-meta">
              <span>👤 ${escapeHTML(item.name)}</span>
              <span style="opacity:0.6; font-weight:normal;">${item.timestamp || ''}</span>
            </div>
            <p>${escapeHTML(item.comment)}</p>
          `;
          reviewsFeed.appendChild(reviewCard);
        });
      })
      .catch(() => {
        reviewsFeed.innerHTML = `<p style="text-align: center; color: #ff4757; font-size: 12px; padding: 15px;">Failed to stream review list.</p>`;
      });
  }

  // Prevent Cross-Site Scripting vulnerabilities by stripping HTML characters
  function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // ==========================================
  // 2. DROPDOWN ACCORDION HANDLING (FOODS)
  // ==========================================
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', function(e) {
      e.stopPropagation();
      e.preventDefault();
      
      const currentDropdown = this.closest('.menu-item-dropdown');
      const dropdownContent = currentDropdown.querySelector('.dropdown-content');
      const isCurrentlyOpen = dropdownContent.classList.contains('show');
      
      document.querySelectorAll('.dropdown-content').forEach(content => {
        content.classList.remove('show');
      });
      
      if (!isCurrentlyOpen) {
        dropdownContent.classList.add('show');
      }
    });
  });

  const dropdownHeaders = document.querySelectorAll('.dropdown-header');
  dropdownHeaders.forEach(header => {
    header.addEventListener('click', function() {
      const toggleBtn = this.querySelector('.dropdown-toggle');
      if (toggleBtn) toggleBtn.click();
    });
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('.menu-item-dropdown')) {
      document.querySelectorAll('.dropdown-content').forEach(content => {
        content.classList.remove('show');
      });
    }
  });

  // ==========================================
  // 3. STANDARD ITEM DIRECT LOGIC (FOOD & DESSERTS)
  // ==========================================
  document.querySelectorAll('.standard-item').forEach(item => {
    item.addEventListener('click', function(e) {
      e.stopPropagation();
      
      const name = this.getAttribute('data-name');
      const price = parseInt(this.getAttribute('data-price'), 10);

      const cartItem = {
        name: name,
        flavour: "Standard",
        price: price
      };

      cart.push(cartItem);
      updateCartUI();
      
      // Apply color reflection animation
      this.classList.remove('item-clicked');
      void this.offsetWidth; // Trigger reflow to restart animation
      this.classList.add('item-clicked');
      
      setTimeout(() => { this.classList.remove('item-clicked'); }, 600);
    });
  });

  // ==========================================
  // 4. COFFEE FLAVOUR MODAL CONTROLLER
  // ==========================================
  const modal = document.getElementById('flavourModal');
  const closeModal = document.querySelector('.close-modal');
  const flavourOptions = document.querySelectorAll('.flavour-option');
  const addToCartBtn = document.getElementById('addToCartBtn');

  document.querySelectorAll('.coffee-item').forEach(item => {
    item.addEventListener('click', function() {
      currentSelectedCoffee = {
        name: this.getAttribute('data-name'),
        basePrice: parseInt(this.getAttribute('data-price'), 10)
      };
      
      document.getElementById('modalCoffeeName').innerText = `Customize ${currentSelectedCoffee.name}`;
      
      flavourOptions.forEach(opt => opt.classList.remove('selected'));
      if (flavourOptions[0]) flavourOptions[0].classList.add('selected');
      
      selectedFlavour = "Regular";
      selectedAddonPrice = 0;
      
      modal.style.display = 'flex';
    });
  });

  flavourOptions.forEach(option => {
    option.addEventListener('click', function() {
      flavourOptions.forEach(opt => opt.classList.remove('selected'));
      this.classList.add('selected');
      
      selectedFlavour = this.getAttribute('data-flavour');
      selectedAddonPrice = parseInt(this.getAttribute('data-addon'), 10);
    });
  });

  if (closeModal) {
    closeModal.addEventListener('click', () => { modal.style.display = 'none'; });
  }
  window.addEventListener('click', (e) => {
    if (e.target === modal) { modal.style.display = 'none'; }
  });

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', function() {
      if (!currentSelectedCoffee) return;

      const finalPrice = currentSelectedCoffee.basePrice + selectedAddonPrice;
      const cartItem = {
        name: currentSelectedCoffee.name,
        flavour: selectedFlavour,
        price: finalPrice
      };

      cart.push(cartItem);
      updateCartUI();
      modal.style.display = 'none';
    });
  }
});

// ==========================================
// 5. PERSISTENT CART PANEL DRAW RENDERING
// ==========================================
function updateCartUI() {
  const cartBar = document.getElementById('bottomCartBar');
  const countSpan = document.getElementById('cartItemCount');
  const priceDiv = document.getElementById('cartTotalPrice');

  if (!cartBar || !countSpan || !priceDiv) return;

  if (cart.length > 0) {
    cartBar.style.display = 'flex';
    countSpan.innerText = cart.length;
    
    const total = cart.reduce((sum, item) => sum + item.price, 0);
    priceDiv.innerText = `Total: ₹${total}`;
  } else {
    cartBar.style.display = 'none';
  }
}

// ==========================================
// 6. AUTOMATED WHATSAPP ORDER GENERATOR
// ==========================================
function sendWhatsAppOrder() {
  if (cart.length === 0) return;
  
  let textMessage = "Hello Craving Kitchen! 😋\nI'd like to place an order:\n\n";
  
  cart.forEach((item, index) => {
    if (item.flavour === "Standard" || item.flavour === "Regular") {
      textMessage += `${index + 1}. *${item.name}* - ₹${item.price}\n`;
    } else {
      textMessage += `${index + 1}. *${item.name}* (Flavour: ${item.flavour}) - ₹${item.price}\n`;
    }
  });
  
  const absoluteTotal = cart.reduce((sum, item) => sum + item.price, 0);
  textMessage += `\n📦 *Total Order Bill: ₹${absoluteTotal}*`;
  textMessage += `\n\nPlease confirm my order! Thank you.`;

  const encryptedPayload = encodeURIComponent(textMessage);
  
  // Send to both contact numbers
  const contactNumbers = ['918745053549', '918130020219'];
  
  contactNumbers.forEach((number, index) => {
    setTimeout(() => {
      window.open(`https://wa.me/${number}?text=${encryptedPayload}`, '_blank');
    }, index * 500); // Stagger the window opens by 500ms
  });
}