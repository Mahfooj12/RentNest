function scrollFilters(scrollAmount) {
  const container = document.getElementById('filters');
  container.scrollLeft += scrollAmount;
}

// Optional: Add active class to selected filter
document.querySelectorAll('.filter').forEach(el => {
  el.addEventListener('click', () => {
    document.querySelectorAll('.filter').forEach(f => f.classList.remove('active'));
    el.classList.add('active');
  });
});