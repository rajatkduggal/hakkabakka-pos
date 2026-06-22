fetch("https://rdl70wqz.c36.airoapp.ai/menu")
  .then(response => response.json())
  .then(data => {
    let output = "";

    data.forEach(item => {
      output += `
        <div style="padding:10px; border-bottom:1px solid #ccc;">
          <h3>${item.name}</h3>
          <p>Half: ₹${item.price_half}</p>
          <p>Full: ₹${item.price_full}</p>
        </div>
      `;
    });

    document.getElementById("menu").innerHTML = output;
  })
  .catch(error => {
    document.getElementById("menu").innerHTML =
      "Error loading menu";
    console.log(error);
  });
