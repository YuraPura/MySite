// slider.js (полностью обновленный код)
document.addEventListener('DOMContentLoaded', () => {
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const navContainer = document.querySelector('.nav-container');
  
    // Гамбургер-меню
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('active');
    });
  
    // Закрытие при клике вне меню
    document.addEventListener('click', (e) => {
      if (!navContainer.contains(e.target)) {
        navLinks.classList.remove('active');
      }
    });
  
    // Плавная прокрутка
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
          navLinks.classList.remove('active'); // Закрываем меню после клика
        }
      });
    });
  });