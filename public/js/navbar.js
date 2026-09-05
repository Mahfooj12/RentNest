// --- Airbnb-style Search Bar Interactivity ---

// (All old/legacy dropdown code for Where, Who, Check-in, and Check-out has been removed)

document.addEventListener('DOMContentLoaded', function () {
  // Dropdown logic for desktop/tablet
  const dropdownSections = [
    {
      trigger: document.querySelector('.airbnb-search-where'),
      dropdown: document.querySelector('.airbnb-where-dropdown')
    },
    {
      trigger: document.querySelector('.airbnb-search-checkin'),
      dropdown: document.querySelector('.airbnb-checkin-dropdown')
    },
    {
      trigger: document.querySelector('.airbnb-search-guests'),
      dropdown: document.querySelector('.airbnb-guests-dropdown')
    }
  ];

  function closeAllDropdowns() {
    dropdownSections.forEach(({dropdown, trigger}) => {
      if (dropdown) dropdown.style.display = 'none';
      if (trigger) trigger.classList.remove('active');
    });
  }

  dropdownSections.forEach(({trigger, dropdown}) => {
    if (trigger && dropdown) {
      trigger.addEventListener('click', function(e) {
        if (window.innerWidth < 768) return; // Only for desktop/tablet
        e.stopPropagation();
        if (dropdown.style.display === 'block') {
          dropdown.style.display = 'none';
          trigger.classList.remove('active');
        } else {
          closeAllDropdowns();
          dropdown.style.display = 'block';
          trigger.classList.add('active');
          // Focus input for where
          if (trigger.classList.contains('airbnb-search-where')) {
            const whereInput = trigger.querySelector('.airbnb-where-input');
            if (whereInput) whereInput.focus();
          }
          // Render calendar for check-in
          if (trigger.classList.contains('airbnb-search-checkin')) {
            renderAirbnbCalendar('airbnbCalendar');
          }
        }
      });
    }
  });

  // Close dropdowns on outside click
  document.addEventListener('click', function(e) {
    if (window.innerWidth < 768) return;
    closeAllDropdowns();
  });

  // Prevent closing when clicking inside dropdown
  dropdownSections.forEach(({dropdown}) => {
    if (dropdown) {
      dropdown.addEventListener('click', function(e) {
        e.stopPropagation();
      });
    }
  });

  // Keyboard accessibility: close dropdowns on Escape
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') closeAllDropdowns();
  });

  // --- Location Input: Filter and select suggestion ---
  const whereInput = document.querySelector('.airbnb-where-input');
  const whereDropdown = document.querySelector('.airbnb-where-dropdown');
  if (whereInput && whereDropdown) {
    const suggestionButtons = Array.from(whereDropdown.querySelectorAll('.list-group-item'));
    whereInput.addEventListener('input', function() {
      const val = whereInput.value.toLowerCase();
      suggestionButtons.forEach(btn => {
        const text = btn.textContent.toLowerCase();
        btn.style.display = text.includes(val) ? '' : 'none';
      });
    });
    suggestionButtons.forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        whereInput.value = btn.querySelector('span').textContent;
        closeAllDropdowns();
      });
    });
    whereInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') {
        const firstVisible = suggestionButtons.find(btn => btn.style.display !== 'none');
        if (firstVisible) {
          whereInput.value = firstVisible.querySelector('span').textContent;
          closeAllDropdowns();
        }
      }
    });
  }

  // --- Calendar: Date range selection for check-in/check-out ---
  let selectedStart = null;
  let selectedEnd = null;
  const checkinInput = document.querySelector('.airbnb-checkin-input');
  const checkoutInput = document.querySelector('.airbnb-checkout-input');
  const checkinDropdown = document.querySelector('.airbnb-checkin-dropdown');

  function updateDateInputs() {
    if (checkinInput) checkinInput.value = selectedStart ? selectedStart.toLocaleDateString() : '';
    if (checkoutInput) checkoutInput.value = selectedEnd ? selectedEnd.toLocaleDateString() : '';
  }

  function renderAirbnbCalendar(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const today = new Date();
    let currentMonth = today.getMonth();
    let currentYear = today.getFullYear();

    function getMonthName(month, year) {
      return new Date(year, month).toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    function getDaysInMonth(month, year) {
      return new Date(year, month + 1, 0).getDate();
    }
    function getFirstDayOfWeek(month, year) {
      return new Date(year, month, 1).getDay();
    }
    function isToday(day, month, year) {
      return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    }
    function isInRange(day, month, year) {
      if (!selectedStart || !selectedEnd) return false;
      const d = new Date(year, month, day);
      return d > selectedStart && d < selectedEnd;
    }
    function isSelected(day, month, year) {
      if (!selectedStart) return false;
      const d = new Date(year, month, day);
      return d.getTime() === selectedStart.getTime() || (selectedEnd && d.getTime() === selectedEnd.getTime());
    }

    function renderMonths() {
      let html = '<div class="airbnb-calendar"><div class="airbnb-calendar-header">';
      html += `<button class="calendar-nav" id="calendarPrev">&#8592;</button>`;
      html += `<span>${getMonthName(currentMonth, currentYear)}</span>`;
      html += `<span>${getMonthName((currentMonth+1)%12, currentMonth===11?currentYear+1:currentYear)}</span>`;
      html += `<button class="calendar-nav" id="calendarNext">&#8594;</button>`;
      html += '</div><div class="airbnb-calendar-months">';
      for (let m = 0; m < 2; m++) {
        let month = (currentMonth + m) % 12;
        let year = currentYear + Math.floor((currentMonth + m) / 12);
        html += '<div class="airbnb-calendar-month">';
        html += `<div class="airbnb-calendar-month-title">${getMonthName(month, year)}</div>`;
        html += '<div class="airbnb-calendar-weekdays">';
        ['S','M','T','W','T','F','S'].forEach(d => html += `<div>${d}</div>`);
        html += '</div><div class="airbnb-calendar-days">';
        let firstDay = getFirstDayOfWeek(month, year);
        let days = getDaysInMonth(month, year);
        for (let i = 0; i < firstDay; i++) html += '<button class="airbnb-calendar-day disabled"></button>';
        for (let d = 1; d <= days; d++) {
          let classes = 'airbnb-calendar-day';
          if (isToday(d, month, year)) classes += ' today';
          if (isSelected(d, month, year)) classes += ' selected';
          if (isInRange(d, month, year)) classes += ' in-range';
          html += `<button class="${classes}" data-day="${d}" data-month="${month}" data-year="${year}">${d}</button>`;
        }
        html += '</div></div>';
      }
      html += '</div></div>';
      container.innerHTML = html;
      // Navigation
      document.getElementById('calendarPrev').onclick = function(e) {
        e.stopPropagation();
        if (currentMonth === 0) {
          currentMonth = 11;
          currentYear--;
        } else {
          currentMonth--;
        }
        renderMonths();
      };
      document.getElementById('calendarNext').onclick = function(e) {
        e.stopPropagation();
        if (currentMonth === 11) {
          currentMonth = 0;
          currentYear++;
        } else {
          currentMonth++;
        }
        renderMonths();
      };
      // Date range selection
      container.querySelectorAll('.airbnb-calendar-day:not(.disabled)').forEach(btn => {
        btn.onclick = function(e) {
          e.stopPropagation();
          const day = parseInt(btn.getAttribute('data-day'));
          const month = parseInt(btn.getAttribute('data-month'));
          const year = parseInt(btn.getAttribute('data-year'));
          const selectedDate = new Date(year, month, day);
          if (!selectedStart || (selectedStart && selectedEnd)) {
            selectedStart = selectedDate;
            selectedEnd = null;
          } else if (selectedStart && !selectedEnd) {
            if (selectedDate > selectedStart) {
              selectedEnd = selectedDate;
              updateDateInputs();
              setTimeout(() => {
                if (checkinDropdown) {
                  checkinDropdown.style.display = 'none';
                  document.querySelector('.airbnb-search-checkin').classList.remove('active');
                }
              }, 250); // Small delay for UX
            } else {
              selectedStart = selectedDate;
              selectedEnd = null;
            }
          }
          updateDateInputs();
          renderMonths();
        };
      });
    }
    renderMonths();
  }

  // --- Guest Selector: Update summary in input ---
  const guestsInput = document.querySelector('.airbnb-guests-input');
  const guestCounts = { adults: 0, children: 0, infants: 0 };
  function updateGuestSummary() {
    let summary = [];
    if (guestCounts.adults) summary.push(`${guestCounts.adults} adult${guestCounts.adults > 1 ? 's' : ''}`);
    if (guestCounts.children) summary.push(`${guestCounts.children} child${guestCounts.children > 1 ? 'ren' : ''}`);
    if (guestCounts.infants) summary.push(`${guestCounts.infants} infant${guestCounts.infants > 1 ? 's' : ''}`);
    guestsInput.value = summary.length ? summary.join(', ') : '';
  }
  document.querySelectorAll('.airbnb-guest-minus').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const type = btn.getAttribute('data-type');
      guestCounts[type] = Math.max(0, guestCounts[type] - 1);
      document.querySelector(`.airbnb-guest-count[data-type="${type}"]`).textContent = guestCounts[type];
      updateGuestSummary();
    });
  });
  document.querySelectorAll('.airbnb-guest-plus').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const type = btn.getAttribute('data-type');
      guestCounts[type] = guestCounts[type] + 1;
      document.querySelector(`.airbnb-guest-count[data-type="${type}"]`).textContent = guestCounts[type];
      updateGuestSummary();
    });
  });

  // --- UI Polish: Custom scrollbar for location dropdown ---
  const locationListGroup = document.querySelector('.airbnb-where-dropdown .list-group');
  if (locationListGroup) {
    locationListGroup.style.scrollbarWidth = 'thin';
    locationListGroup.style.scrollbarColor = '#ff385c #f7f7f7';
    locationListGroup.style.transition = 'box-shadow 0.2s';
  }
});
