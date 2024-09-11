import QRCodeStyling from "qr-code-styling";

export const QRCODE: any = {
  width: 300,
  height: 300,
  data: null,
  image: "",
  type: "svg",
  dotsOptions: {
    color: "#4267B2",
    type: "rounded",
  },
  backgroundOptions: {
    color: "#ffffff",
  },
  cornersSquareOptions: {
    type: "extra-rounded",
  },
  cornersDotOptions: {
    type: "dot",
  },
  imageOptions: {
    hideBackgroundDots: true,
    crossOrigin: "anonymous", 
    margin: 20, 
  },
}