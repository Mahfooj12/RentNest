
function loadMap(coordinates, title) {
  const map = L.map('map').setView(coordinates, 13);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
  }).addTo(map);

  L.marker(coordinates)
    .addTo(map)
    .bindPopup(title)
    .openPopup();
}






