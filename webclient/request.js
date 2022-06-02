const myForm = document.querySelector('#my-form');
//const selectedSymbol = document.querySelector('#symbol');

myForm.addEventListener('submit', onSubmit);

function onSubmit(e) {
  e.preventDefault();

  const url = '/status';
    
  var xmlHttp = new XMLHttpRequest();

  xmlHttp.open("GET", url, true);     

  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == XMLHttpRequest.DONE && xmlHttp.status == 200 ) {
      console.log(xmlHttp.responseText);
    }
  };
  
  xmlHttp.send(formData); 
  console.log(xmlHttp.responseText); 
}
