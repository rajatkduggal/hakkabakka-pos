window.onload = function () {
  fetch("https://utrdl70wqz.c36.airoapp.ai/menu")
    .then(function(response) {
      if (!response.ok) {
        throw new Error("Server error");
      }
      return response.json();
    })
    .then(function(data) {
      let output = "";

      for (let i = 0; i < data.length; i++) {
        output += "<div>";
        output += "<h3>" + data[i].name + "</h3>";
        output += "<p>Half: ₹" + data[i].price_half + "</p>";
        output += "<p>Full: ₹" + data[i].price_full + "</p>";
        output += "<hr>";
        output += "</div>";
      }

      document.getElementById("menu").innerHTML = output;
    })
    .catch(function(error) {
      console.log("Error:", error);
      document.getElementById("menu").innerHTML =
        "<p>Menu load failed. Check backend.</p>";
    });
};
