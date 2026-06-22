fetch("https://rdl70wqz.c36.airoapp.ai/menu")
.then(response => response.json())
.then(data => {
    let output = "";

    data.forEach(item => {
        output += `
            <div>
                <h3>${item.name}</h3>
                <p>Half: ₹${item.price_half}</p>
                <p>Full: ₹${item.price_full}</p>
                <hr>
            </div>
        `;
    });

    document.getElementById("menu").innerHTML = output;
})
.catch(error => {
    console.log(error);
});
