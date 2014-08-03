function getImageUrl(card) {
	return "http://mtgimage.com/card/" + encodeURIComponent(card.imageName) + ".jpg";
}
function loadSuccess() {
	var img = this;
	if (img.naturalWidth == 480 && img.naturalHeight == 680) {
		$(img).addClass("clip-border-1");
	} else if (img.naturalWidth == 223 && img.naturalHeight == 310) {
		$(img).addClass("clip-border-2");
	}
	$(img).removeClass('loading');
}

function loadError() {
	var img = this;
	$(img).css("background", "#900");
}
