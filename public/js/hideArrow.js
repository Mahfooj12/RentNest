
  const scrollContainer = document.getElementById('filters');
  const leftArrow = document.querySelector('.left-arrow').parentElement;
  const rightArrow = document.querySelector('.right-arrow').parentElement;

  function updateArrows() {
    const scrollLeft = scrollContainer.scrollLeft;
    const maxScrollLeft = scrollContainer.scrollWidth - scrollContainer.clientWidth;

    leftArrow.style.display = scrollLeft > 0 ? 'flex' : 'none';
    rightArrow.style.display = scrollLeft < maxScrollLeft - 1 ? 'flex' : 'none';
  }

  function scrollFilters(amount) {
    scrollContainer.scrollBy({ left: amount, behavior: 'smooth' });
  }

  // Recheck scroll position after scroll completes
  scrollContainer.addEventListener('scroll', updateArrows);
  window.addEventListener('load', updateArrows);