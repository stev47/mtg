var cards = [];

function query(callback) {
	$.ajax({
		url: 'query',
		type: 'POST',
		data: $('#search form').serializeArray(),
		dataType: 'json',
		success: function (data) {
			cards = data;
			show_result();
		}
	});
}

function card_toggle(card_el, cb) {
	card_data = card_el.data();
	card_view_el = $('.card-view', card_el);

	switch (card_data.layout) {
		case 'flip':
			card_view_el.toggleClass('flipped');
			break;
		case 'double-faced':
			card_view_el.toggleClass('turned');
			break;
		case 'split':
			var toggle = card_view_el.data('toggle');

			card_view_el.removeClass('split-' + toggle);
			toggle = (toggle + 1) % 3;
			card_view_el.addClass('split-' + toggle);

			card_view_el.data('toggle', toggle)
			break;
		default:
	}
}

function show_result() {
	$('div#result').empty();
	$.each(cards, function (i, card_data) {

		var card_el = $('<figure>')
			.data(card_data)
			.addClass('card')

		var card_view_el = $('<div>')
			.data('toggle', 0)
			.addClass('card-view')
			.appendTo(card_el);
		var card_front_el = $('<img>').appendTo(card_view_el);
		var card_back_el = $('<img>');

		card_front_el.load(loadSuccess).error(loadError);
		card_back_el.load(loadSuccess).error(loadError);

		// feed frontside
		card_front_el
			.data(card_data)
			.addClass('loading')
			//.css('background-image', 'url(' + getImageUrl(card_data) + ')')
			.attr('src', getImageUrl(card_data))
			.attr('alt', card_data.name)
			.addClass('front')

		// on double-faced cards: feed backside with information
		if (card_data.layout == 'double-faced' && card_data.backside) {
			card_back_el
				.data(card_data.backside)
				.addClass('loading')
				.attr('src', 'http://mtgimage.com/card/' + card_data.backside.imageName + '.jpg')
				.attr('alt', card_data.backside.name)
				.addClass('back')
				.appendTo(card_view_el)
		}

		//

		// toggle-event
		card_el.on('contextmenu', function (e) { return false });
		card_el.on('mouseup', function (e) {
			if (e.which == 2 || e.which == 3) {
				card_toggle($(this));
				e.preventDefault();
			}
		});

		// insert card
		card_el.appendTo($('div#result'));
	});
}


$(function () {
	$('#search form').submit(function () { return false });
	$('#search form').on('change', query);

	$.getJSON('types', function (data) {
		var types_el = $('select[name=type]');
		$.each(data, function (i, v) {
			$('<option>').text(v.name).appendTo(types_el);
		});
	})

	query();
})
