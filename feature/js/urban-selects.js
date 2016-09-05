
// $(".styled-select").click(function () {
//     var element = $(this).children("select")[0],
//         worked = false;
//     if(document.createEvent) { // all browsers
//         var e = document.createEvent("MouseEvents");
//         e.initMouseEvent("mousedown", true, true, window, 0, 0, 0, 0, 0, false,false, false, false, 0, null);
//         worked = element.dispatchEvent(e);
//     } else if (element.fireEvent) { // ie
//         worked = element.fireEvent("onmousedown");
//     }
//     if (!worked) { // unknown browser / error
//         alert("It didn't worked in your browser.");
//     }
// });

$(".styled-select select")
  .change(function(){
    doStuff($(".styled-select.foo select").val());
    var m = $(this);
    if(m.val() == ""){
      m.css("color", "#818385");
    }else{ m.css("color", "#333")}
});

var isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1;
if (isFirefox){
  $(".styled-select select").css("pointer-events","visible");
}

function doStuff(value){
    drawMap(global_data, value)
}