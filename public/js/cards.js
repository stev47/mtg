function getImageUrl(card) {
	//return "http://mtgimage.com/card/" + encodeURIComponent(card.imageName) + ".jpg";
	//return "https://api.mtgdb.info/content/card_images/" + encodeURIComponent(card.multiverseid) + ".jpeg";
	//return "https://api.mtgdb.info/content/hi_res_card_images/" + encodeURIComponent(card.multiverseid) + ".jpg";
	return card.imgUrl;
}
function loadSuccess() {
	var img = this;
	if (img.naturalWidth == 480 && img.naturalHeight == 680) {
		$(img).addClass("clip-border-1");
	} else if (img.naturalWidth == 480 && img.naturalHeight == 660) {
		$(img).addClass("clip-border-3");
	} else if (img.naturalWidth == 223 && img.naturalHeight == 310) {
		$(img).addClass("clip-border-2");
	} else if (img.naturalWidth == 265 && img.naturalHeight == 370) {
		$(img).addClass("clip-border-4");
	} else if (img.naturalWidth == 312 && img.naturalHeight == 445) {
		$(img).addClass("clip-border-1");
	}
	$(img).removeClass('loading');
}

function loadError() {
	var img = this;
	$(img).css("background", "#900");
}
