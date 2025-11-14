
let cropper;
let portrait = false;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function redraw(blob, newCropper) {
    const image_canvas = document.getElementById('uploadedImage');
    image_canvas.src = URL.createObjectURL(blob);
    while (!image_canvas.complete) {
        await sleep(100);
    }

    portrait = image_canvas.height > image_canvas.width;
    if (cropper) cropper.destroy();
    if (newCropper) {
        const aspectRatio = calculateAspectRatio(image_canvas.width, image_canvas.height);
        cropper = new Cropper(image_canvas, {
            viewMode: 2,
            aspectRatio: aspectRatio,
            background: false,
            scalable: false,
            zoomable: false,
            zoomOnTouch: true,
            zoomOnWheel: false,
            maxCanvasHeight: window.innerHeight * 0.5,
        });
    }
}

function calculateAspectRatio(width, height) {
    const panel = document.getElementById("panel-type").dataset.value;
    let landscape;
    let portrait;
    switch (panel) {
        case 'epd7in3f':
            landscape = 800 / 480;
            portrait = 480 / 800;
            break;

        case 'epd4in0e':
            landscape = 600 / 400;
            portrait = 400 / 600;
            break;
    }
    if (width > height) {
        return landscape;
    } else if (height > width) {
        return portrait;
    } else {
        return 1; // Square
    }
}

window.initCropper = async (dotNetStreamRef, type, cropper) => {
    const response = await dotNetStreamRef.stream();
    const reader = response.getReader();
    const chunks = [];
    let received = 0;
    const contentLength = +document.getElementById("panel-type").dataset.size || 0;
    const progressBar = document.getElementById("progress-bar");
    progressBar.style.width = "0%";
    progressBar.parentElement.style.display = "block";

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;

        if (contentLength > 0) {
            const percent = Math.min(100, (received / contentLength) * 100);
            progressBar.style.width = percent + "%";
        }
    }

    progressBar.parentElement.style.display = "none";
    const blob = new Blob(chunks, { type: type });
    await redraw(blob, cropper);
};

window.portraitCropper = async () => {
    if (cropper) {
        const image_canvas = document.getElementById('uploadedImage');
        const aspectRatio = calculateAspectRatio(image_canvas.width, image_canvas.height);
        if (portrait) {
            cropper.setAspectRatio(aspectRatio);
        } else {
            cropper.setAspectRatio(1 / aspectRatio);
        }
    }
};

window.landscapeCropper = async () => {
    if (cropper) {
        const image_canvas = document.getElementById('uploadedImage');
        const aspectRatio = calculateAspectRatio(image_canvas.width, image_canvas.height);
        if (portrait) {
            cropper.setAspectRatio(1 / aspectRatio);
        } else {
            cropper.setAspectRatio(aspectRatio);
        }
    }
};

window.cropImage = async () => {
    if (cropper) {
        await cropper.crop();
        cropper.getCroppedCanvas().toBlob(async (blob) => {
            await redraw(blob, false);
        });
    };
}

window.getCroppedImage = async () => {
    const image_canvas = document.getElementById('uploadedImage');
    const req = new Request(image_canvas.src);
    const buf = await fetch(req)
        .then(async (response) => await response.blob())
        .then(async (blob) => {
            return new Uint8Array(await blob.arrayBuffer())
        });

    return buf;
};

window.getRatio = async () => {
    return portrait;
};

window.showPopup = async (message) => {
    alert(message);
};

window.shutdown = async () => {
    await fetch("    /shutdown")
}

function reportWindowSize() {
    cropper.reset()
}

window.onresize = reportWindowSize;


document.addEventListener("DOMContentLoaded", () => {
    window.addEventListener('beforeunload', function (event) {
        // A message for older browsers, though modern browsers ignore this custom message.
        const confirmationMessage = "Are you sure you want to leave this page?";

        // Setting this property shows the confirmation dialog.
        event.returnValue = confirmationMessage;

        // For modern browsers, return a string to show the default confirmation dialog.
        return confirmationMessage;
    });
});