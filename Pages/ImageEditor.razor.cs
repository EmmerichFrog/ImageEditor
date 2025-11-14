using Microsoft.AspNetCore.Components;
using Microsoft.AspNetCore.Components.Forms;
using Microsoft.JSInterop;
using SkiaSharp;

public class ImageEditorBase : ComponentBase {
    [Inject] IJSRuntime JS { get; set; } = default!;
    [Inject] protected HttpClient Http { get; set; } = default!;
    protected string? panel = "epd4in0e";
    private int width;
    private int height;
    protected IBrowserFile? selectedFile;
    protected bool imageLoaded = false;
    protected bool imageCropped = false;
    protected bool imageResized = false;
    public bool portrait = false;
    private string contentType = "";
    public ImageEditorBase() {
        panel ??= Environment.GetEnvironmentVariable("PANEL_TYPE");
        switch (panel) {
            case "epd7in3f":
                width = 800;
                height = 480;
                break;

            case "epd4in0e":
                width = 400;
                height = 600;
                break;

            default:
                break;
        }
    }
    protected async Task HandleFileSelected(InputFileChangeEventArgs e) {
        selectedFile = e.File;
        using var stream = selectedFile.OpenReadStream(maxAllowedSize: 20_000_000);
        var streamRef = new DotNetStreamReference(stream);
        contentType = selectedFile.ContentType;
        await JS.InvokeVoidAsync("initCropper", streamRef, selectedFile.ContentType, true);
        imageLoaded = true;
        imageCropped = false;
        imageResized = false;
    }

    protected async Task SetPortraitCropper() {
        await JS.InvokeVoidAsync("portraitCropper");
        StateHasChanged();
    }
    protected async Task SetLandscapeCropper() {
        await JS.InvokeVoidAsync("landscapeCropper");
        StateHasChanged();
    }
    protected async Task CropImage() {
        await JS.InvokeVoidAsync("cropImage");
        imageCropped = true;
        StateHasChanged();
    }

    protected async Task SubmitImage() {
        var croppedImage = await JS.InvokeAsync<byte[]>("getCroppedImage");
        portrait = await JS.InvokeAsync<bool>("getRatio");

        SKData resizedData;
        if (portrait) {
            resizedData = ResizeImg(croppedImage, width, height);
        } else {
            resizedData = ResizeImg(croppedImage, height, width);
        }
        imageResized = true;
        StateHasChanged();
        var streamRef = new DotNetStreamReference(resizedData.AsStream());
        await JS.InvokeVoidAsync("initCropper", streamRef, "image/png", false);
        StateHasChanged();

        var content = new MultipartFormDataContent {
            { new ByteArrayContent(resizedData.ToArray()), "cropped_image_data", "cropped_image_data" }
        };


        var response = await Http.PostAsync("https://192.168.50.2/converted", content);
        string message;
        if (response.IsSuccessStatusCode) {
            message = "Image successfully set!";
        } else {
            message = "Error with setting image!";
        }
        await JS.InvokeVoidAsync("showPopup", message);
    }

    private static SKData ResizeImg(byte[] image, int width, int height) {
        using var originalBitmap = SKBitmap.Decode(image);
        var newImageInfo = new SKImageInfo(width, height);
        using var resizedBitmap = originalBitmap.Resize(newImageInfo, SKFilterQuality.High);
        using var resizedImg = SKImage.FromBitmap(resizedBitmap);
        return resizedImg.Encode(SKEncodedImageFormat.Jpeg, 90);
    }
}