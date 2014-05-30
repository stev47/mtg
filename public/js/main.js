$(function () {
	$('input[name=regex]').bind('change', function () {
		$.getJSON('regex/' + encodeURIComponent($('input[name=regex]').val()), function (data) {
			$('div#result').empty();
			$.each(data, function (i, card) {
				$('<div>')
					.append(
						$('<img>').attr('src', 'http://mtgimage.com/multiverseid/' + card.multiverseid + '.jpg')
					)
					.appendTo($('div#result'));
			});
		});
	});
})
