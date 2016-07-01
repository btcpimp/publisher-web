ipfs.setProvider({host: '163.172.10.4', port: '5001', protocol: 'http'});

// Set up here so that it is accessable in other methods.
var duration = 0;

$('#previewButton').click(function(e){
	var hasPaymentInfo = false;
	var mediaType = "#" + $("#metainfo div.active").attr('id');
	console.log(mediaType);
	// Validate form.
	// Required: Video Title
	if (isBlank($(mediaType + ' #title').val())){
		swal("Error!", "You must provide a title", "error");
		$(mediaType + " #artifactTitleGroup").addClass('has-error');
		return;
	} else {
		$(mediaType + " #artifactTitleGroup").removeClass('has-error');
	}
	// Required: Date
	if (isBlank($(mediaType + ' #releaseDate').val()) || isNaN(parseInt($(mediaType + ' #releaseDate').val())) || parseInt($(mediaType + ' #releaseDate').val()) <= 0){
		swal("Error!", "You must provide a release year", "error");
		$(mediaType + " #artifactDateGroup").addClass('has-error');
		return;
	} else {
		$(mediaType + " #artifactDateGroup").removeClass('has-error');
	}
	// Required: Description
	if (isBlank($(mediaType + ' #description').val())){
		swal("Error!", "You must provide a description", "error");
		$(mediaType + " #artifactDescriptionGroup").addClass('has-error');
		return;
	} else {
		$(mediaType + " #artifactDescriptionGroup").removeClass('has-error');
	}

	// Validate optional items for music metadata
	if (mediaType == '#music'){
		// Optional: Artist Name
		if (isBlank($(mediaType + ' #artistName').val())){
			$(mediaType + " #artifactArtistGroup").addClass('has-warning');
		} else {
			$(mediaType + " #artifactArtistGroup").removeClass('has-warning');
		}
		// Optional: Genere
		if (isBlank($(mediaType + ' #genere').val())){
			$(mediaType + " #artifactGenereGroup").addClass('has-warning');
		} else {
			$(mediaType + " #artifactGenereGroup").removeClass('has-warning');
		}
		// Optional: Tags
		if (isBlank($(mediaType + ' #tags').val())){
			$(mediaType + " #artifactTagsGroup").addClass('has-warning');
		} else {
			$(mediaType + " #artifactTagsGroup").removeClass('has-warning');
		}
		// Optional: Record Label
		if (isBlank($(mediaType + ' #recordLabel').val())){
			$(mediaType + " #artifactRecordLabelGroup").addClass('has-warning');
		} else {
			$(mediaType + " #artifactRecordLabelGroup").removeClass('has-warning');
		}
	}
	// Validate optional items for video metadata
	if (mediaType == '#video'){
		// Optional: Director Name
		if (isBlank($(mediaType + ' #directorName').val())){
			$(mediaType + " #artifactDirectorGroup").addClass('has-warning');
		} else {
			$(mediaType + " #artifactDirectorGroup").removeClass('has-warning');
		}
		// Optional: Distributor
		if (isBlank($(mediaType + ' #distributor').val())){
			$(mediaType + " #artifactDistributorGroup").addClass('has-warning');
		} else {
			$(mediaType + " #artifactDistributorGroup").removeClass('has-warning');
		}
	}

	// Check if there is any pricing info entered at all
	// Optional: Pricing
	$('.price').each(function(){
		if (!isBlank($(this).val()))
			hasPaymentInfo = true;
	});
	// Required: Bitcoin Address
	if (hasPaymentInfo && isBlank($('#bitcoinAddressGroup input').val())){
		swal("Error!", "You must provide a Bitcoin address", "error");
		$("#bitcoinAddressGroup").addClass('has-error');
		return;
	} else {
		$("#bitcoinAddressGroup").removeClass('has-error');
	}

	// Set all of the items in the preview.
	// Set title.
	$('#previewTitle').text($(mediaType + ' #title').val());
	// Set Publisher
	if (mediaType == 'music')
		$('#previewArtist').text($(mediaType + ' #artist').val());
	else if (mediaType == 'video')
		$('#previewArtist').text($(mediaType + ' #directorName').val());
	// Set Description
	$('#previewDescription').text($(mediaType + ' #description').val());
	// Set Media
	try {
		var newURL = URL.createObjectURL(mediaFiles[0]);
		$('#previewVideo').attr('src', newURL);
	} catch(e) {
		swal('Error', 'You must select a video file.', 'error');
		return;
	}
	// Try to set poster
	try {
		var reader = new FileReader();
		reader.onload = function (e) {
		  $('#previewVideo').attr('poster', e.target.result);
		};
		reader.readAsDataURL($(mediaType + ' #posterFile').prop('files')[0]);
	} catch(e) { }
	// Get and set runtime
	window.URL = window.URL || window.webkitURL;
	var video = document.createElement('video');
	video.preload = 'metadata';
	video.onloadedmetadata = function() {
		window.URL.revokeObjectURL(this.src)
		duration = video.duration;
		mediaFiles[0].duration = duration;
		$("#runtime").text(formatRuntime(duration.toFixed(0).toString()));
	}
	video.src = URL.createObjectURL(mediaFiles[0]);
	// Set the publish time/date
	var dateString = dateFormat(new Date(), "dddd, mmmm dS, yyyy, h:MM:ss TT Z");
	$('#current-time').text(dateString);

	$('#previewModal').modal('show');
})

function submitArtifact(){
	// Pause the preview video to stop it playing
	$('#previewVideo').get(0).pause();

	swal({
		title: "Are you sure?",
		text: "You will not be able to change this later! Please make sure everything is correct!",
		type: "warning",
		showCancelButton: true,
		confirmButtonClass: "btn-success",
		confirmButtonText: "Yes, publish it!",
		closeOnConfirm: true
	},
	function(){
		window.onbeforeunload = function() {
			return "You are currently publishing, are you sure you want to navigate away?";
		}
		var walletAddress = $("#publisherSelect").val().replace(/[^()](?=([^()]*\([^()]*\))*[^()]*$)/g, '').replace('(', '').replace(')', '');
		console.log(wallet.balances[walletAddress]);
		if (wallet.balances[walletAddress] < 1){
			tradebot(walletAddress);
			setTimeout(function(){
				swal("Error!", "You must have at least 1 FLO in your wallet to publish an artifact.", "error");
			}, 1000);
			return;
		}
		var $active = $('.wizard .nav-tabs li.active');
		$active.next().removeClass('disabled');
		nextTab($active);
		publishArtifact();
	});
}

function addFilesToIPFS(files, count, callback){
	// Check if files is null.
	if (!files)
		return;

	// Since we are not null, add the files to IPFS
	ipfs.add(files, function (err, hash) {
		if (err || !hash){
			callback("ERROR: " + err, count);
			return;
		}
		console.log(hash);
		callback(hash, count);
		return;
	});
}

function publishArtifact(){
	var mediaType = "#" + $("#metainfo div.active").attr('id');
	var poster = $(mediaType + " #posterFile").prop('files');
	// mediaFiles and extraFiles are defined in dropzone.js

	// count will store the current readable index, total the total amount of files.
	var count = 0;
	var total = 0;

	// Holds all of the files as you push them in.
	var ipfsFiles = [];

	if (poster.length > 0)
		total += poster.length;
	if (mediaFiles.length > 0)
		total += mediaFiles.length;
	if (extraFiles.length > 0)
		total += extraFiles.length;

	function addFile(file, index){
		document.getElementById('publishWell').innerHTML += "[IPFS] Adding " + count + " files to IPFS...</br>";
  		addFilesToIPFS(file, index, function(hash, callIndex){ 
  			var hashes = "";
  			for (var i = 0; i < hash.length-1; i++) {
  				hashes += "\"" + hash[i].Name + "\", ";
  			}
  			document.getElementById('publishWell').innerHTML += "[IPFS] Files added to IPFS: " + hashes + "</br>";

  			allFilesAddedToIPFS(hash);
		});
	}

	// Add the poster file. We are safe to assume 0 as there is only one index.
	if (poster.length > 0){
  		ipfsFiles[count] = poster[0];
  		count++;
	}

	// Add all media files.
	if (mediaFiles.length > 0){
		for (var i = 0; i < mediaFiles.length; i++) {
  			ipfsFiles[count] = mediaFiles[i];
			count++;
		}
	}

	// Add all extra files.
	if (extraFiles.length > 0){
		for (var i = 0; i < extraFiles.length; i++) {
	  		ipfsFiles[count] = extraFiles[i];
			count++;
		}
	}

	addFile(ipfsFiles, count);

	// This function will be called once all files have been added
	function allFilesAddedToIPFS(hashes){
		document.getElementById('publishWell').innerHTML += "All files added to IPFS, publishing artifact...</br>";

		// Select media type based off of pill nav
		var mediaType = "#" + $("#metainfo div.active").attr('id');

		// Load the selected and only keep the address that is inside the parens.
		var walletAddress = $("#publisherSelect").val().replace(/[^()](?=([^()]*\([^()]*\))*[^()]*$)/g, '').replace('(', '').replace(')', '');
		var title = $(mediaType + ' #title').val();
		var description = $(mediaType + ' #description').val();
		var year = parseInt($(mediaType + ' #releaseDate').val());
		var bitcoinAddress = $('#bitcoinAddress').val();

		var mainHashIndex = 0;
		if (!isBlank($(mediaType + ' #posterFile').val()))
			mainHashIndex = 1;

		var alexandriaMedia = {
			"torrent": hashes[hashes.length-1].Hash,
			"publisher": walletAddress,
			"timestamp": Date.now(),
			"type": mediaType.replace('#',''),
			"payment": {
				// Commented out because Libraryd hates me :c
				//"fiat": "USD", // Hardcode USD, unknown if is needed yet.
				//"paymentToken": "BTC", // Hardcode BTC, unknown if is needed yet
				//"paymentAddress": bitcoinAddress
			},
			"info": {
				"title": title,
				"description": description,
				"year": year,
				"extra-info": {
					"DHT Hash": hashes[hashes.length-1].Hash,
					"filename": hashes[mainHashIndex].Name,
					//"runtime": duration.toFixed(0),
					"files": []
				}
			}
		};

		// If item is not blank, then add it, otherwise just continue as these are all optional.
		if (!isBlank(bitcoinAddress))
			alexandriaMedia["info"]["extra-info"]["Bitcoin Address"] = bitcoinAddress;

		// Optional Fields
		var poster = $(mediaType + ' #posterFile').val();

		// Metadata per artifact type
		if (mediaType == '#music'){
			var artistName = $(mediaType + ' #artistName').val();
			var genere = $(mediaType + ' #genere').val();
			var tags = $(mediaType + ' #tags').val();
			var recordLabel = $(mediaType + ' #recordLabel').val();

			if (!isBlank(artistName))
				alexandriaMedia["info"]["extra-info"]["artist"] = artistName;

			if (!isBlank(genere))
				alexandriaMedia["info"]["extra-info"]["genere"] = genere;

			if (!isBlank(genere))
				alexandriaMedia["info"]["extra-info"]["tags"] = tags;

			if (!isBlank(recordLabel))
				alexandriaMedia["info"]["extra-info"]["company"] = recordLabel;
		}
		else if (mediaType == '#video'){
			var director = $(mediaType + ' #directorName').val();
			var distributor = $(mediaType + ' #distributor').val();	

			if (!isBlank(director))
				alexandriaMedia["info"]["extra-info"]["artist"] = director;

			if (!isBlank(distributor))
				alexandriaMedia["info"]["extra-info"]["company"] = distributor;
		}

		if (!isBlank(mediaFiles)){
			for (var i = 0; i < mediaFiles.length; i++) {
				// Get Display Name from Table
				var displayName = $('#' + sanitizeID(mediaFiles[i].name) + ' #name').val();
				if (displayName == mediaFiles[i].name)
					displayName = "";
				// Get Type from Table
				var type = $('#' + sanitizeID(mediaFiles[i].name) + ' #type').val();
				// Get duration from table
				//var duration = duration.toFixed(0); // Need to un-hardcode this...
				// Get prices from table
				var priceSelector = '#' + sanitizeID(mediaFiles[i].name) + 'price';
				var minPlay = $(priceSelector + ' #minPlay').val();
				var sugPlay = $(priceSelector + ' #sugPlay').val();
				var minBuy = $(priceSelector + ' #minBuy').val();
				var sugBuy = $(priceSelector + ' #sugBuy').val();
				// Get checkboxes from pricing table
				var disallowPlay = $(priceSelector + ' #disPlay').is(':checked');
				var disallowBuy = $(priceSelector + ' #disBuy').is(':checked');

				var fileJSON = {
					"fname": mediaFiles[i].name,
					"duration": mediaFiles[i].duration,
					"type": mediaType.replace('#','')
				}

				// Set all optional fields
				if (!isBlank(displayName))
					fileJSON['dname'] = displayName

				if (!isBlank(minPlay))
					fileJSON['minPlay'] = minPlay;

				if (!isBlank(sugPlay))
					fileJSON['sugPlay'] = sugPlay;

				if (!isBlank(minBuy))
					fileJSON['minBuy'] = minBuy;

				if (!isBlank(sugBuy))
					fileJSON['sugBuy'] = sugBuy;

				if (disallowPlay)
					fileJSON['disallowPlay'] = true;

				if (disallowBuy)
					fileJSON['disallowBuy'] = true;

				alexandriaMedia["info"]["extra-info"]["files"].push(fileJSON)
			}
		}

		if (!isBlank(poster)){
			var type = 'preview'
			if (mediaType == '#music'){
				type = 'coverArt';
				alexandriaMedia["info"]["extra-info"]["coverArt"] = hashes[0].Name;
			} else if (mediaType == '#video'){
				type = 'preview'
				alexandriaMedia["info"]["extra-info"]["posterFrame"] = hashes[0].Name;
			}

			alexandriaMedia["info"]["extra-info"]["files"].push({
				"dname": 'Cover Art',
				"fname": hashes[0].Name,
				"type": type
			})
		}

		if (!isBlank(extraFiles)){
			for (var i = 0; i < extraFiles.length; i++) {
				// Get Display Name from Table
				var displayName = $('#' + sanitizeID(extraFiles[i].name) + ' #name').val();
				if (displayName == extraFiles[i].name)
					displayName = "";
				// Get Type from Table
				var type = $('#' + sanitizeID(extraFiles[i].name) + ' #type').val();
				// Get prices from table
				var priceSelector = '#' + sanitizeID(extraFiles[i].name) + 'price';
				var minPlay = $(priceSelector + ' #minPlay').val();
				var sugPlay = $(priceSelector + ' #sugPlay').val();
				var minBuy = $(priceSelector + ' #minBuy').val();
				var sugBuy = $(priceSelector + ' #sugBuy').val();
				// Get checkboxes from pricing table
				var disallowPlay = $(priceSelector + ' #disPlay').is(':checked');
				var disallowBuy = $(priceSelector + ' #disBuy').is(':checked');

				var fileJSON = {
					"fname": extraFiles[i].name,
					"type": type
				}

				// Set all optional fields
				if (!isBlank(displayName))
					fileJSON['dname'] = displayName

				if (!isBlank(minPlay))
					fileJSON['minPlay'] = minPlay;

				if (!isBlank(sugPlay))
					fileJSON['sugPlay'] = sugPlay;

				if (!isBlank(minBuy))
					fileJSON['minBuy'] = minBuy;

				if (!isBlank(sugBuy))
					fileJSON['sugBuy'] = sugBuy;

				if (disallowPlay)
					fileJSON['disallowPlay'] = true;

				if (disallowBuy)
					fileJSON['disallowBuy'] = true;

				alexandriaMedia["info"]["extra-info"]["files"].push(fileJSON)
			}
		}


		document.getElementById('publishWell').innerHTML += '<pre>' + JSON.stringify(alexandriaMedia, null, 4) + "</pre><br>";

		LibraryDJS.publishArtifact(wallet, hashes[hashes.length-1].Hash, walletAddress, alexandriaMedia, function(err, data){
			if (err != null){
				swal("Error!", "There was an error publishing your artifact: " + err, "error");
			} else {
				document.getElementById('publishWell').innerHTML += "Successfully published artifact! <br>";
				window.onbeforeunload = function() {}
				swal({
				  title: "Success!",
				  text: "Your artifact was published successfully! It should take around two minutes to show up on the Media Browser depending on Florincoin block times.",
				  type: "success",
				  showCancelButton: false,
				  confirmButtonClass: "btn-success",
				  confirmButtonText: "Ok",
				  closeOnConfirm: true
				},
				function(){
					// Redirect to browser :)
				  	window.location.replace("http://alexandria.io/browser/");
				});
			}
		});
	}
}

function isBlank(str) {
	return (!str || /^\s*$/.test(str));
}

function formatRuntime(runtimeInt) {
	var sec_num = parseInt(runtimeInt, 10); // don't forget the second param
	var hours   = Math.floor(sec_num / 3600);
	var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
	var seconds = sec_num - (hours * 3600) - (minutes * 60);

	if (hours   < 10) {hours   = "0"+hours;}
	if (minutes < 10) {minutes = "0"+minutes;}
	if (seconds < 10) {seconds = "0"+seconds;}

	if (hours == '00')
		var time = minutes+':'+seconds;
	else
		var time = hours+':'+minutes+':'+seconds;

	return time;
}