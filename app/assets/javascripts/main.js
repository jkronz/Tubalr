// variables to be used throughout
var genres            = ["rock","seenlive","alternative","indie","electronic","pop","metal","femalevocalists","classicrock","alternativerock","jazz","punk","indierock","folk","ambient","singer-songwriter","experimental","electronica","hardrock","hip-hop","80s","dance","hardcore","blackmetal","chillout","progressiverock","deathmetal","instrumental","heavymetal","british","punkrock","soundtrack","industrial","soul","blues","classical","emo","rap","90s","thrashmetal","metalcore","trance","japanese","favorites","reggae","acoustic","country","progressivemetal","trip-hop","hiphop","powermetal","funk","psychedelic","melodicdeathmetal","newwave","post-rock","electro","house","indiepop","techno","german","love","70s","rnb","britpop","american","gothicmetal","downtempo","piano","60s","00s","grunge","post-punk","albumsiown","beautiful","ska","gothic","screamo","mellow","chill","doommetal","french","guitar","oldies","idm","swedish","malevocalists","awesome","j-rock","numetal","symphonicmetal","finnish","lounge","polish","femalevocalist","grindcore","progressive","folkmetal","canadian","post-hardcore","world","drumandbass","synthpop","j-pop","newage","minimal","favourites","ebm","russian","poprock","cover","poppunk","latin","darkwave","favorite","female","darkambient","noise","industrialmetal","avant-garde","psychedelicrock","brutaldeathmetal","dub","disco","gothicrock","celtic","sexy","easylistening","alternativemetal","anime","christian","bluesrock","cool","favourite","classic","shoegaze","heardonpandora","folkrock","stonerrock","comedy","psytrance","christmas","sad","atmospheric","melancholy","fun","deathcore","jpop","deutsch","romantic","vikingmetal","fusion","femalefrontedmetal","irish","uk","visualkei","spanish","relax","hardcorepunk","acidjazz","relaxing","alt-country","amazing","covers","favoritesongs","italian","lo-fi","garagerock","happy","goth","melancholic","rockabilly","live","swing","ethereal","dark","norwegian","emocore","ballad","glamrock","australian","brazilian","malevocalist","good","americana","party","softrock","synthpop","political","melodicmetal","sludge","jrock","epic","hiphop","rocknroll","postrock","technicaldeathmetal","usa","favouritesongs","vocal","femalevocals","remix","speedmetal","club","electropop","contemporaryclassical","bossanova","funky","baroque","rhythmandblues","progressivetrance","electroclash","russianrock","brasil","neofolk","triphop","nu-metal","dancehall","industrialrock","rockandroll","guitarvirtuoso","worldmusic","drone","smoothjazz","dnb","breakbeat","catchy","rapcore","dubstep","artrock","loved","summer","thrash","drumnbass","darkelectro","psychobilly","mpb","undergroundhip-hop","skapunk","southernrock","medieval","vocaltrance","dreamy","christianrock","dreampop","paganmetal","minimaltechno","nujazz","breakcore","english"];
var videos            = new Array();
var currenttrack      = 0;
var search            = "";
var prev_search       = "";
var playlist_owner    = "";
var search_type       = "";
var videosCopy        = "";
var direction         = "forward";

var is_mobile = false;

var userId            = 0;
var userUsername      = null;
var bannedVideos      = [];

var tag               = null;
var firstScriptTag    = null;
var thePlayer;

var firstSearch       = true;

// set user id
function setUserInfo (id, username) {
  userId        = id;
  userUsername  = username;
  
  // get users banned videos
  $.ajax({
    type: 'POST',
    url: '/check_banned',
    data: {
      user_id:  userId
    },
    dataType: 'json',
    success: function(data) {
      bannedVideos = data;
    }
  });
}

function is_blocked (video) {
  var blocked = false;

  if (video.hasOwnProperty("app$control")) blocked = true;
  
  return blocked;
}

function is_music (video) {
  var music = true;
  
  if (video.media$group.media$category[0].$t != "Music") music = false;
  
  return music;
}

function is_unique (track_name, video) {
  var unique = true
  
  $.each(videos, function () {
    if (this.VideoID == video.id.$t.split(":")[3]) unique = false;
    
    var tmp_title1 = this.VideoTitle.toLowerCase().replace(/ *\([^)]*\) */g, '').replace(/[^a-zA-Z ]/g, "");
    var tmp_title2 = video.title.$t.toLowerCase().replace(/ *\([^)]*\) */g, '').replace(/[^a-zA-Z ]/g, "");
    
    if (tmp_title1 == tmp_title2) unique = false;
  });
   
  return unique;
}

function is_cover_or_remix (video) {
  var cover_or_remix = false;
  
  if (video.title.$t.toLowerCase().search("cover") != -1 || video.title.$t.toLowerCase().search("remix") != -1 || video.title.$t.toLowerCase().search("alternate") != -1) cover_or_remix = true;
  
  return cover_or_remix;
}

function is_live (video) {
  var live_video = false;
  
  if (search.toLowerCase().search("live") > -1) return live_video;
  
  if (video.title.$t.toLowerCase().search("live") > -1 || video.title.$t.toLowerCase().search("@") > -1 || video.title.$t.toLowerCase().search("19") > -1 || video.title.$t.toLowerCase().search("200") > -1) live_video = true;
  
  if (!live_video) {
    $.each(video.category, function () {
      if (this.term.toLowerCase() == "live") live_video = true;
    });
  }

  return live_video
}

function is_not_banned (video_id) {
  var video_banned = true;

  $.each(bannedVideos, function () {
    if (this == video_id) video_banned = false;
  });
  
  return video_banned;
}

function prepare_search (who, type_of_search) {
  if (thePlayer) thePlayer.stopVideo();
  $('#player').hide();
  $('#empty-playlist').hide();
  $('#welcome').hide();
  $('#loading-playlist').show();

  videos        = []; 
  currenttrack  = 0;
  search        = who;
  search_type   = type_of_search;
}

// genre search
function genreSearch (who) {
  prepare_search(who, "genre");
  
	$.getJSON('http://developer.echonest.com/api/v4/artist/search?api_key=OYJRQNQMCGIOZLFIW&format=jsonp&callback=?&results=20&style='+who, function(data) {
		var ajaxs = [];

		$.each(data.response.artists, function (i, artist) {
      ajaxs.push(
        $.getJSON('http://gdata.youtube.com/feeds/api/videos?q='+artist.name+'&orderby=relevance&start-index=1&max-results=10&v=2&alt=json-in-script&callback=?', function(data) {
  		  	$.each(data.feed.entry, function (i,video) {
    			  var video_is_good = false;
          
            if (!video_is_good && !is_blocked(video) && is_music(video) && !is_cover_or_remix(video)) {
  					  videos.push({ 
  							VideoID: video.id.$t.split(":")[3], 
  							VideoTitle: video.title.$t,
  							ArtistName: artist.name 
  						});
  					  video_is_good = true;
  					}
    			});
  		  })
  	  )
  	});
		
		$.when.apply($,ajaxs).then(initPlaylist);
	});  
}

// artist wasnt found in echonest artist data store
function not_echonest_artist (who) {
  prepare_search(who, "just");
  
  $.getJSON('http://gdata.youtube.com/feeds/api/videos?q='+escape(who)+'&orderby=relevance&start-index=1&max-results=20&v=2&alt=json-in-script&callback=?', function(data) {
    $.each(data.feed.entry, function (i, video) {
      if (!is_blocked(video) && is_not_banned(video.id.$t.split(":")[3])) {
        videos.push({ 
          VideoID: video.id.$t.split(":")[3], 
          VideoTitle: video.title.$t 
        });
      }
    });
    
    initPlaylist();
  });
}

function video (video_id) {
	videos        = [];
  currenttrack  = 0;
  search_type   = "video";
  url           = "/video/" + video_id;

	$.getJSON('https://gdata.youtube.com/feeds/api/videos/' + video_id + '?v=2&alt=json-in-script&callback=?', function (data) {
		var single_vid = data.entry;
    if (typeof single_vid !== "undefined") {      
      var video_is_good = false;
      if (!video_is_good && !is_blocked(single_vid)) {
				videos.push({ 
				  VideoID: single_vid.id.$t.split(":")[3], 
				  VideoTitle: single_vid.title.$t
				}); 
				video_is_good = true;
				search        = single_vid.title.$t;
      }
    }

  	initPlaylist();
	});
}

function rain () {
  firstSearch = false;
  videos = [{ VideoID: '1pSyYhRYeIM', VideoTitle: 'rain' }];
  
  var tag = document.createElement('script');
  tag.src = "http://www.youtube.com/player_api?version=3";
  var firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
  
  $.get('/insert_search/relaxation/rain');
}

function share_rain_on_facebook () {
  FB.ui({
      method: 'stream.publish',
      attachment: {
        name: "Relaxing rain, brought to you by tubalr!",
        href: "http://www.tubalr.com/rain",
        description: ("Tubalr allows you to effortlessly listen to a band's or artist's top YouTube videos without all the clutter YouTube brings.")
      },
      display: 'popup'
    },
    function (response) {
    }
  );
  return false;
}

function share_rain_on_twitter () {
  var width  = 575,
      height = 400,
      left   = ($(window).width()  - width)  / 2,
      top    = ($(window).height() - height) / 2,
      url    = "https://twitter.com/share?text=I%27m%20listening%20to%20relaxing%20rain%20on%20%40tubalr%21&url=http%3A%2F%2Ftubalr.com%2Frain",
      opts   = 'status=1' +
               ',width='  + width  +
               ',height=' + height +
               ',top='    + top    +
               ',left='   + left;

  window.open(url, 'twitter', opts);
}

// multi search
function is_multi_search (who) {
  if (who.split(";").length > 1) {
    return true;
  }
  else {
    return false;
  }
}

function multi (who) {
  var artists = [];
  
  $.each(who.split(";"), function (i, artist) {
    artists.push($.trim(artist));
  });
  
  prepare_search(artists.join(";"), "multi");

  var get_artist_tracks_calls = [];
  var get_videos_calls        = [];
  
  $.each(artists, function (i, artist) {
    get_artist_tracks_calls.push($.getJSON('http://developer.echonest.com/api/v4/artist/songs?api_key=OYJRQNQMCGIOZLFIW&name='+escape(artist)+'&format=jsonp&callback=?&start=0&results=15' , function (data) {
      if (data.response.status.code != 5) {
        $.each(data.response.songs, function (i, track) {
          get_videos_calls.push($.getJSON('http://gdata.youtube.com/feeds/api/videos?q='+escape(artist)+'%20%2D$20'+escape(track.title)+'&orderby=relevance&start-index=1&max-results=5&v=2&alt=json-in-script&callback=?&format=5', function (data) {            
  					if (typeof data.feed.entry !== "undefined") {
    					var video_is_good = false;

      				$.each(data.feed.entry, function (i, video) {
                if (!video_is_good && !is_blocked(video) && is_music(video) && !is_cover_or_remix(video) && is_not_banned(video.id.$t.split(":")[3])) {
      				  	videos.push({ 
      							VideoID: video.id.$t.split(":")[3], 
      							VideoTitle: video.title.$t,
      							ArtistName: artist 
      						});
    						
      						video_is_good = true;
      					}
      				});
            }
    			}));
        });
      }
    }));
  });
  
  $.when.apply($, get_artist_tracks_calls).then(function () {
    $.when.apply($, get_videos_calls).then(initPlaylist);      
  });
}

// just artist/band
function just (who) {
  if (who == "rain" || who == "relaxing rain" || who == "rain recording") {
    window.location = "/rain";
  }
  
  if ($.inArray(who.replace(/[ +]/g, ""), genres) > -1) {
    genreSearch(who);
  }
  else {
    if (is_multi_search(who)) {
      multi(who);
      return;
    } 
    
    prepare_search(who, "just");
    
    $.getJSON('http://developer.echonest.com/api/v4/artist/songs?api_key=OYJRQNQMCGIOZLFIW&name='+escape(who)+'&format=jsonp&callback=?&start=0&results=40' , function(data) {
      if (data.response.status.code == 5 || data.response.songs.length <= 10) {
        not_echonest_artist(who);
      }
      else {
        var ajaxs = [];
        
        $.each(data.response.songs, function (i, track) {
          if (track.title.toLowerCase().search("cover") == -1 && track.title.toLowerCase().search("remix") == -1) {
            ajaxs.push(
              $.getJSON('http://gdata.youtube.com/feeds/api/videos?q='+escape(who)+'%20%2D$20'+escape(track.title)+'&orderby=relevance&start-index=1&max-results=10&v=2&format=5&alt=json-in-script&callback=?', function(data) {
                if (typeof data.feed.entry !== "undefined") {
                  var video_is_good = false;
                  
                  $.each(data.feed.entry, function(i,video) {
                    if (!video_is_good && !is_blocked(video) && !is_live(video) && is_music(video) && is_unique(track.title, video) && !is_cover_or_remix(video) && is_not_banned(video.id.$t.split(":")[3])) {
                      videos.push({ 
                        VideoID: video.id.$t.split(":")[3], 
                        VideoTitle: video.title.$t
                      }); 
                      
                      video_is_good = true;
                    }
                  });
                }
              })
            );
          }
        });
        
        $.when.apply($,ajaxs).then(initPlaylist);
      }
    });
  } 
}

// similar artist/bands
function similarTo (who) {
  prepare_search(who, "similar");
  
	$.getJSON('http://developer.echonest.com/api/v4/artist/similar?api_key=OYJRQNQMCGIOZLFIW&name='+escape(who)+'&format=jsonp&callback=?&results=20&start=0', function(data) {
		var ajaxs = [];
		
		$.each(data.response.artists, function (i, artist) {
			ajaxs.push($.getJSON('http://gdata.youtube.com/feeds/api/videos?q='+escape(artist.name)+'&orderby=relevance&start-index=1&max-results=10&v=2&alt=json-in-script&callback=?&format=5', function(data) {
					var video_is_good = false;
					
					$.each(data.feed.entry, function (i, video) {  
            if (!video_is_good && !is_blocked(video) && is_music(video) && !is_cover_or_remix(video) && is_not_banned(video.id.$t.split(":")[3])) {
					  	videos.push({ 
  							VideoID: video.id.$t.split(":")[3], 
  							VideoTitle: video.title.$t,
  							ArtistName: artist.name 
  						});
  						
  						video_is_good = true;
  					}
					});
				})
			)
	  });
	  
	  $.when.apply($,ajaxs).then(initPlaylist);
  });
}

// user playlist
function userPlaylist (un, playlist_name) {
  videos          = [];
  currenttrack    = 0;
  search          = playlist_name;
  search_type     = "playlist";
  playlist_owner  = un;
  url             = "/" + playlist_owner + "/playlist/" + playlist_name + ".json";

  $.getJSON(url, function (data) {
    videos = data;
	  initPlaylist(); 
	});
}

function onYouTubePlayerAPIReady () {
  thePlayer = new YT.Player('ytplayerid', {
    videoId: videos[currenttrack].VideoID,
    width: 800,
    height: 400,
    version: 3,
    playerVars: { 'autoplay': 1, 'rel': 0, 'theme': 'dark', 'showinfo': 0, 'autohide': 1, 'wmode': 'opaque', 'allowScriptAccess': 'always', 'version': 3, 'restriction': 'US' },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': onPlayerError
    }
  });
}

// start the playlist
function initPlaylist () {
  if (videos.length == 0) {
    $('#loading-playlist').hide();
    $('#empty-playlist').fadeIn();
  }
  else {
    _gaq.push(['_trackPageview', (search_type == 'playlist' ? playlist_owner.replace(/[ ]/g,"+")+"/playlist/"+search.replace(/[ ]/g,"+") : search_type+"/"+search.replace(/[ ]/g,"+"))]);
  
    videos.sort(function () { return (Math.round(Math.random())-0.5); });
  
    if (firstSearch) {
      var tag = document.createElement('script');
      tag.src = "http://www.youtube.com/player_api?version=3";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    $('#loading-playlist').hide();
    $('#welcome').fadeOut();
     
    videosCopy = "";
    $.each(videos, function(i) {
      videosCopy = videosCopy + '<a href="#" id="'+this.VideoID+'"><input type="button" class="share-video" data-video-id="' + this.VideoID + '" data-video-title="' + this.VideoTitle + '" value="Share Video"/>'+this.VideoTitle+'</a>';
    });
  	$('#playlist').html(videosCopy);
    
    if (prev_search != search) {  
    	$.get('/insert_search/' + search_type + '/' + escape(search));
  	  prev_search = search;
  	}
	
  	$('#twitter').data('url',"https://twitter.com/share?text=I%27m%20listening%20to%20"+(search_type == 'similar' ? 'artists%2Fbands%20similar%20to%20' : '')+search.replace(/ /g,"%20")+"%20on%20%40tubalr%21&url=http%3A%2F%2Ftubalr.com%2F"+(search_type == 'playlist' ? playlist_owner.replace(/[ +]/g,"%2B")+"%2Fplaylist%2F"+search.replace(/[ +]/g,"%2B") : search_type+"%2F"+search.replace(/[ +]/g,"%2B")));

  	currentVideo(videos[currenttrack]);
	  firstSearch = false;
  
	  if (search_type == 'just') {
	    getInfo();
    }
  	
  	if (search_type == 'playlist' || search_type == 'video') {
  	  $('#info-button').hide();
  	}
  	else {
  	  $('#info-icon').show();
  	}
  	
		if (search_type == 'video') {
			$('#player-controls').hide();
			$('#share').hide();
		}
		else {
			$('#player-controls').show();
			$('#share').show();
		}
		
  	$('#player').fadeIn(1000);
  }
}

// denote current song in the ui
function currentVideo (video) {
  if (search_type == 'similar' || search_type == 'genre' || search_type == 'multi') {
    getInfo();
  }
  
  document.title = video.VideoTitle;
  
  if (!firstSearch) {
    firstSearch = false;
    thePlayer.loadVideoById(video.VideoID, 0);
  }
	
	$('#playlist .active').removeClass('active');
	$('#'+video.VideoID).addClass('active');
}

// jump to a certain video
function jumpTo (VideoID) {
	currenttrack = VideoID;
	currentVideo(videos[currenttrack]);
}

// next
function nextSong (removedFromList) {
  direction = "forward";

  if (removedFromList) {
    if (currenttrack == videos.length) {
      currenttrack = 0;
	    currentVideo(videos[currenttrack]);
	  }
	  else {
	    currentVideo(videos[currenttrack]);
	  }
  }
	else if (currenttrack == videos.length-1) {
		currenttrack = 0;
		currentVideo(videos[currenttrack]);
	}
	else {
		currenttrack = currenttrack+=1;
		currentVideo(videos[currenttrack]);
	}
	
	return false;
}

// previousSong
function previousSong () {
  direction = "backward";
	if (currenttrack == 0) {
		currenttrack = videos.length-1;
		currentVideo(videos[currenttrack]);
	}
	else {
		currenttrack = currenttrack-=1;
		currentVideo(videos[currenttrack]);
	}
	return false;
}

// YouTube player changes states
function onPlayerStateChange (newState) {
  // if track ended
	if (newState.data == 0) {
	  $.get('/video_viewed/' + videos[currenttrack].VideoID);
    nextSong();
  }
}

//YouTube player error
function onPlayerError (errorCode) {
	if (direction == "backward") {
	  previousSong();
	} 
	else {
	  nextSong();
	}
}

function onPlayerReady () { }

function facebook () {
  FB.ui({
      method: 'stream.publish',
      attachment: {
        name: (search_type == 'similar' ? 'Artists/Bands similar to ' : '')+unescape(search.replace(/[+]/g," "))+", brought to you by tubalr!",
        href: "http://www.tubalr.com/"+(search_type == 'playlist' ? playlist_owner.replace(/ /g,"+")+'/playlist/'+search.replace(/ /g,"+") : search_type+"/"+search.replace(/ /g,"+")),
        description: ("Tubalr allows you to effortlessly listen to a band's or artist's top YouTube videos without all the clutter YouTube brings.")
      },
      display: 'popup'
    },
    function (response) {
    }
  );
  
  return false;
}

function share_video_facebook (video_id, video_title) {
  FB.ui({
      method: 'stream.publish',
      attachment: {
        name: video_title + ", brought to you by tubalr!",
        href: "http://www.tubalr.com/video/" + video_id,
        description: ("Tubalr allows you to effortlessly listen to a band's or artist's top YouTube videos without all the clutter YouTube brings.")
      },
      display: 'popup'
    },
    function (response) {
    }
  );
  return false;
}

function remove_from_playlist () {
  $("#playlist #"+videos[currenttrack].VideoID).remove();
  videos.splice(currenttrack, 1);

  
  if (videos.length == 0) {
    thePlayer.stopVideo();
    $('#player').fadeOut();
    $('#empty-playlist').fadeIn();
  }
  else {
    nextSong("removedFromList");
  }
}

function remove_video () {
  if (userId != 0) {
    if (userUsername == playlist_owner) {
      $.ajax({
        type: 'POST',
        url: '/playlist/delete_video',
        data: {
          user_id:        userId,  
          playlist_name:  search,
          video_id:       videos[currenttrack].VideoID
        },
        dataType: 'json',
        success: function(data) {
          if (data.success) {
            remove_from_playlist();
          }
        }
      }); 
    }
    else {
      $.ajax({
        type: 'POST',
        url: '/ban_video',
        data: {
          user_id:  userId,  
          video_id: videos[currenttrack].VideoID
        },
        dataType: 'json',
        success: function(data) {
          bannedVideos.push(videos[currenttrack].VideoID);
          remove_from_playlist();
        }
      });
    }
  }
  else {
    remove_from_playlist();
  }
}

function getInfo () {
  var tmpWho = "";
  if (search_type == 'similar' || search_type == 'genre' || search_type == 'multi') {
    tmpWho = videos[currenttrack].ArtistName;
  }
  else {
   tmpWho = search; 
  }
  
  $.getJSON('http://developer.echonest.com/api/v4/artist/biographies?api_key=OYJRQNQMCGIOZLFIW&name=' + tmpWho + '&format=jsonp&callback=?&results=1&start=0&license=cc-by-sa', function(data) {
		if (data.response.status.code == 5) {
		  $('#info').dialog({ title: "No Info" });
		  $('#info').html('No information could be found for the artist/band you supplied.');
		}
		else {
		  $('#info').dialog({ title: tmpWho.replace(/[+]/g,' ') });
		  $('#info').html(data.response.biographies[0].text.replace(/[\n]/g,"<br/>"));
		}
	});
}

function share_single (video_id, video_title) {
	$('#share-video div.facebook').data('video-id', video_id);
	$('#share-video div.facebook').data('video-title', video_title);	
	$('#share-video div.twitter').data('video-id', video_id);
	$('#share-video div.twitter').data('video-title', video_title);
	$('.url').val('http://www.tubalr.com/video/' + video_id);
}

function detect_mobile () {
  if ( navigator.userAgent.match(/Android/i)
   || navigator.userAgent.match(/webOS/i)
   || navigator.userAgent.match(/iPhone/i)
   || navigator.userAgent.match(/iPad/i)
   || navigator.userAgent.match(/iPod/i)
   || navigator.userAgent.match(/BlackBerry/i)
   ) {
    is_mobile = true;
    $('.social').remove();
    $('#share').remove();
    $('#notices').remove();
    $('.about-tubalr').remove();
    $('.blog-link').remove();
    $('.settings-link').remove();
    $('aside#icons').remove();
    $('#s2id_add-to-playlist-dropdown').remove();
    $('#ytplayerid').addClass('mobile-ytplayerid');
    $('#explore section').addClass('mobile');
    $('body').addClass('mobile-body');
    $('#listenForm input').addClass('mobile');
    $('.why-register').remove();
    $('#rain').addClass('mobile');
    $('#searching-info').hide();
  }
}

$(document).ready(function () { 
  detect_mobile();

  if (typeof FB !== "undefined") {
    FB.init({ 
      appId   : '239275546125436', 
      status  : true, 
      cookie  : true, 
      xfbml   : true 
    });
	}
	
	$('#share-video div.facebook').click(function () {
		share_video_facebook($(this).data('video-id'), $(this).data('video-title'));
	});
	$('#share-video div.twitter').click(function() {
	  var width  = 575,
	      height = 400,
	      left   = ($(window).width()  - width)  / 2,
	      top    = ($(window).height() - height) / 2,
	      url    = "https://twitter.com/share?text=I%27m%20enjoying%20"+$(this).data('video-title')+"%20on%20%40tubalr%21&url=http%3A%2F%2Ftubalr.com%2Fvideo%2f"+$(this).data('video-id'),
	      opts   = 'status=1' +
	               ',width='  + width  +
	               ',height=' + height +
	               ',top='    + top    +
	               ',left='   + left;

	  window.open(url, 'twitter', opts);
	});
	
	$('#playlist').delegate('.share-video', 'click', function (e) {
		share_single($(this).data('video-id'), $(this).data('video-title'));
		$('#share-video').dialog('open');
	  return false;
	});

	$("#playlist").delegate('a', 'mouseenter', function () {
	  if (!is_mobile) $(this).find('.share-video').show();		
	});
	$("#playlist").delegate('a', 'mouseleave', function () {
		if (!is_mobile) $(this).find('.share-video').hide();
	});
	
  $('#remove-video').click(function () {
    remove_video();
    return false;
  });
  
  $('#next').click(function () { 
    nextSong();
    return false;
  });
  $('#previous').click(function () {
    previousSong();
    return false;
  });
  
  $('#info').dialog({
    modal: true,
    autoOpen: false,
    width: 600,
    draggable: false,
		height: 400    
  });
  $('#info-button').click(function () { $('#info').dialog('open'); });
  
	$('#share-video').dialog({
    modal: true,
    autoOpen: false,
    width: 200,
    draggable: false,
		height: 170,
		title: "Share Video"
  });

  $('#about-tubalr').dialog({
    modal: true,
    autoOpen: false,
    width: (is_mobile ? 500 : 600),
    draggable: false,
    title: 'About Tubalr'
  });
  $('.about-tubalr').click(function () { $('#about-tubalr').dialog('open'); });
  
  if ($('.flash-msg')) {
    setTimeout(function () {
      $('.flash-msg').slideUp(500, function () {
        $(this).remove();
      });
    }, 5000);
  }
    
  $('#playlist').delegate('a', 'click', function () { jumpTo($(this).index('#playlist a')); });   
  
  $('table tbody tr').click(function() {
    if ($(this).data('url')) {
      window.open(window.location.protocol+"//"+window.location.host+$(this).data('url'));
    }
  });
  
  $('#main').delay(500).fadeIn(500, function () {
    if ($('#q').val() == "") $("#q").focus();
  });

  $('.just').click(function() {
    if ($('#q').val() != "") just($('#q').val());
  });
  $('.similar').click(function() {
    if ($('#q').val() != "") similarTo($('#q').val());
  });

  $('.url').click(function () { $(this).select(); });

  $('input#q').keypress(function(e) {
    var code = (e.keyCode ? e.keyCode : e.which);
    if (code == 13) { //Enter keycode  
      if ($('#q').val() != "") {
        just($('#q').val());
      }
    }
  });
  
  $('#twitter').click(function(event) {
    var width  = 575,
        height = 400,
        left   = ($(window).width()  - width)  / 2,
        top    = ($(window).height() - height) / 2,
        url    = $(this).data("url"),
        opts   = 'status=1' +
                 ',width='  + width  +
                 ',height=' + height +
                 ',top='    + top    +
                 ',left='   + left;

    window.open(url, 'twitter', opts);
 
    return false;
  });
  
  // Tooltips
  $('.tooltip').tipsy({gravity: 'n'});
  
  // Scroll to Top
  $('#to-top').topLink({
    min: 400
  });
  $('#to-top').click(function(e) {
    e.preventDefault();
    $.scrollTo(0,300);
  });
  
  $('#facebook').click(function () { facebook(); });
  
  // searching info
  $('#searching-info-dialog').dialog({
    modal: true,
    autoOpen: false,
    width: (is_mobile ? 500 : 600),
    draggable: false,
    title: 'Search Methods'
  });
  $('#searching-info').click(function () { $('#searching-info-dialog').dialog('open'); });
});