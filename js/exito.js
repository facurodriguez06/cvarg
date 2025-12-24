window.jsPDF = window.jspdf.jsPDF;

document.addEventListener("DOMContentLoaded", () => {
  // Check if ID is in URL
  const urlParams = new URLSearchParams(window.location.search);
  let orderId = urlParams.get("id");

  if (!orderId) {
    orderId = `CV-${Date.now().toString().slice(-6)}-${Math.floor(
      Math.random() * 900 + 100
    )}`;
  }

  const orderIdElement = document.getElementById("orderId");
  orderIdElement.textContent = orderId;

  const whatsappBtn = document.getElementById("whatsappBtn");
  whatsappBtn.href += orderId;

  const downloadBtn = document.getElementById("downloadBtn");
  downloadBtn.addEventListener("click", () => {
    document.getElementById("receiptOrderId").textContent = orderId;
    const now = new Date();
    document.getElementById("receiptDate").textContent =
      now.toLocaleDateString("es-AR") + " " + now.toLocaleTimeString("es-AR");

    const receiptElement = document.getElementById("receipt");
    receiptElement.style.display = "block";

    html2canvas(receiptElement, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`comprobante-${orderId}.pdf`);
      receiptElement.style.display = "none";
    });
  });

  setTimeout(() => {
    let text = orderId;
    orderIdElement.textContent = "";
    let i = 0;
    function typeWriter() {
      if (i < text.length) {
        orderIdElement.textContent += text.charAt(i);
        i++;
        setTimeout(typeWriter, 100);
      }
    }
    typeWriter();
  }, 1200);
});
