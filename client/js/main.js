
import { Class } from './lib/class.js';
import Types from './gametypes.js';
import log from './lib/log.js';
import { TRANSITIONEND } from './util.js';
import Detect from './detect.js';
import App from './app.js';
import Game from './game.js';
    let app, game;

    const initApp = function() {
        document.addEventListener('DOMContentLoaded', function() {
        	app = new App();
        	window.__app = app;
            app.center();

            if(Detect.isWindows()) {
                // Workaround for graphical glitches on text
                document.body.classList.add('windows');
            }

            if(Detect.isOpera()) {
                // Fix for no pointer events
                document.body.classList.add('opera');
            }

            document.body.addEventListener('click', function(event) {
                if(document.getElementById('parchment').classList.contains('credits')) {
                    app.toggleCredits();
                }

                if(document.getElementById('parchment').classList.contains('about')) {
                    app.toggleAbout();
                }
            });

        	document.querySelectorAll('.barbutton').forEach(function(el) {
        	    el.addEventListener('click', function() {
        	        this.classList.toggle('active');
        	    });
        	});

        	document.getElementById('chatbutton').addEventListener('click', function() {
        	    if(document.getElementById('chatbutton').classList.contains('active')) {
        	        app.showChat();
        	    } else {
                    app.hideChat();
        	    }
        	});

        	document.getElementById('helpbutton').addEventListener('click', function() {
                app.toggleAbout();
        	});

        	document.getElementById('achievementsbutton').addEventListener('click', function() {
                app.toggleAchievements();
                if(app.blinkInterval) {
                    clearInterval(app.blinkInterval);
                }
                this.classList.remove('blink');
        	});

        	document.getElementById('instructions').addEventListener('click', function() {
                app.hideWindows();
        	});

        	document.getElementById('playercount').addEventListener('click', function() {
        	    app.togglePopulationInfo();
        	});

        	document.getElementById('population').addEventListener('click', function() {
        	    app.togglePopulationInfo();
        	});

        	document.querySelectorAll('.clickable').forEach(function(el) {
        	    el.addEventListener('click', function(event) {
                    event.stopPropagation();
        	    });
        	});

        	const toggleCreditsEl = document.getElementById('toggle-credits');
        	if(toggleCreditsEl) {
        	    toggleCreditsEl.addEventListener('click', function() {
        	        app.toggleCredits();
        	    });
        	}

        	document.querySelector('#create-new span').addEventListener('click', function() {
        	    app.animateParchment('loadcharacter', 'confirmation');
        	});

        	document.querySelectorAll('.delete').forEach(function(el) {
        	    el.addEventListener('click', function() {
                    app.storage.clear();
        	        app.animateParchment('confirmation', 'createcharacter');
        	    });
        	});

        	document.querySelector('#cancel span').addEventListener('click', function() {
        	    app.animateParchment('confirmation', 'loadcharacter');
        	});

        	document.querySelectorAll('.ribbon').forEach(function(el) {
        	    el.addEventListener('click', function() {
        	        app.toggleAbout();
        	    });
        	});

            document.getElementById('nameinput').addEventListener("keyup", function() {
                app.toggleButton();
            });

            document.getElementById('previous').addEventListener('click', function() {
                const achievements = document.getElementById('achievements');

                if(app.currentPage === 1) {
                    return false;
                } else {
                    app.currentPage -= 1;
                    achievements.className = 'active page' + app.currentPage;
                }
            });

            document.getElementById('next').addEventListener('click', function() {
                const achievements = document.getElementById('achievements'),
                      lists = document.getElementById('lists'),
                      nbPages = lists.querySelectorAll(':scope > ul').length;

                if(app.currentPage === nbPages) {
                    return false;
                } else {
                    app.currentPage += 1;
                    achievements.className = 'active page' + app.currentPage;
                }
            });

            document.querySelector('#notifications div').addEventListener(TRANSITIONEND, app.resetMessagesPosition.bind(app));

            document.querySelectorAll('.close').forEach(function(el) {
                el.addEventListener('click', function() {
                    app.hideWindows();
                });
            });

            document.querySelectorAll('.twitter').forEach(function(el) {
                el.addEventListener('click', function(event) {
                    const url = this.getAttribute('href');

                   app.openPopup('twitter', url);
                   event.preventDefault();
                   return false;
                });
            });

            document.querySelectorAll('.facebook').forEach(function(el) {
                el.addEventListener('click', function(event) {
                    const url = this.getAttribute('href');

                   app.openPopup('facebook', url);
                   event.preventDefault();
                   return false;
                });
            });

            const data = app.storage.data;
    		if(data.hasAlreadyPlayed) {
    		    if(data.player.name && data.player.name !== "") {
		            document.getElementById('playername').innerHTML = data.player.name;
    		        if(data.player.image) {
    		            const playerImage = document.getElementById('playerimage');
    		            playerImage.setAttribute('src', data.player.image);
    		            playerImage.style.display = '';
    		        }
    		    }
    		}

    		document.querySelectorAll('.play div').forEach(function(el) {
    		    el.addEventListener('click', function(event) {
                    const nameFromInput = document.getElementById('nameinput').getAttribute('value'),
                          nameFromStorage = document.getElementById('playername').innerHTML,
                          name = nameFromInput || nameFromStorage;

                    app.tryStartingGame(name);
                });
    		});

            document.addEventListener("touchstart", function() {},false);

            const resizeCheck = document.getElementById('resize-check');
            resizeCheck.addEventListener("transitionend", app.resizeUi.bind(app));
            resizeCheck.addEventListener("webkitTransitionEnd", app.resizeUi.bind(app));
            resizeCheck.addEventListener("oTransitionEnd", app.resizeUi.bind(app));

            let resizeTimeout;
            window.addEventListener('resize', function() {
                clearTimeout(resizeTimeout);
                resizeTimeout = setTimeout(function() {
                    if(app) {
                        app.resizeUi();
                    }
                }, 100);
            });

            log.info("App initialized.");

            initGame();
        });
    };

    const initGame = function() {

            const canvas = document.getElementById("entities"), background = document.getElementById("background"), foreground = document.getElementById("foreground"), input = document.getElementById("chatinput");

    		game = new Game(app);
    		window.__game = game;
    		game.setup('#bubbles', canvas, background, foreground, input);
    		game.setStorage(app.storage);
    		app.setGame(game);

    		if(app.isDesktop && app.supportsWorkers) {
    		    game.loadMap();
    		}

    		game.onGameStart(function() {
                app.initEquipmentIcons();
    		});

    		game.onDisconnect(function(message) {
    		    document.getElementById('death').querySelector('p').innerHTML = message+"<em>Please reload the page.</em>";
    		    document.getElementById('respawn').style.display = 'none';
    		});

    		game.onPlayerDeath(function() {
    		    if(document.body.classList.contains('credits')) {
    		        document.body.classList.remove('credits');
    		    }
                document.body.classList.add('death');
    		});

    		game.onPlayerEquipmentChange(function() {
    		    app.initEquipmentIcons();
    		});

    		game.onPlayerInvincible(function() {
    		    document.getElementById('hitpoints').classList.toggle('invincible');
    		});

    		game.onNbPlayersChange(function(worldPlayers, totalPlayers) {
    		    const setWorldPlayersString = function(string) {
                              document.querySelector("#instance-population span:nth-child(2)").textContent = string;
                              document.querySelector("#playercount span:nth-child(2)").textContent = string;
                          },
                      setTotalPlayersString = function(string) {
                          document.querySelector("#world-population span:nth-child(2)").textContent = string;
                      };

    		    document.querySelector("#playercount span.count").textContent = worldPlayers;

    		    document.querySelector("#instance-population span").textContent = worldPlayers;
    		    if(worldPlayers == 1) {
    		        setWorldPlayersString("player");
    		    } else {
    		        setWorldPlayersString("players");
    		    }

    		    document.querySelector("#world-population span").textContent = totalPlayers;
    		    if(totalPlayers == 1) {
    		        setTotalPlayersString("player");
    		    } else {
    		        setTotalPlayersString("players");
    		    }
    		});

    		game.onAchievementUnlock(function(id, name, description) {
    		    app.unlockAchievement(id, name);
    		});

    		game.onNotification(function(message) {
    		    app.showMessage(message);
    		});

            app.initHealthBar();

            document.getElementById('nameinput').setAttribute('value', '');
    		document.getElementById('chatbox').setAttribute('value', '');

        	if(game.renderer.mobile || game.renderer.tablet) {
                document.getElementById('foreground').addEventListener('touchstart', function(event) {
                    app.center();
                    app.setMouseCoordinates(event.touches[0]);
                	game.click();
                	app.hideWindows();
                });
            } else {
                document.getElementById('foreground').addEventListener('click', function(event) {
                    app.center();
                    app.setMouseCoordinates(event);
                    if(game) {
                	    game.click();
                	}
                	app.hideWindows();
                    // document.getElementById('chatinput').focus();
                });
            }

            // Remove previously attached body click handler by replacing with new one
            // (vanilla JS can't easily unbind anonymous handlers, so we use a named reference)
            if(window._bodyClickHandler) {
                document.body.removeEventListener('click', window._bodyClickHandler);
            }
            window._bodyClickHandler = function(event) {
                let hasClosedParchment = false;

                if(document.getElementById('parchment').classList.contains('credits')) {
                    if(game.started) {
                        app.closeInGameCredits();
                        hasClosedParchment = true;
                    } else {
                        app.toggleCredits();
                    }
                }

                if(document.getElementById('parchment').classList.contains('about')) {
                    if(game.started) {
                        app.closeInGameAbout();
                        hasClosedParchment = true;
                    } else {
                        app.toggleAbout();
                    }
                }

                if(game.started && !game.renderer.mobile && game.player && !hasClosedParchment) {
                    game.click();
                }
            };
            document.body.addEventListener('click', window._bodyClickHandler);

            document.getElementById('respawn').addEventListener('click', function(event) {
                game.audioManager.playSound("revive");
                game.restart();
                document.body.classList.remove('death');
            });

            document.addEventListener('mousemove', function(event) {
            	app.setMouseCoordinates(event);
            	if(game.started) {
            	    game.movecursor();
            	}
            });

            document.addEventListener('keydown', function(e) {
            	const key = e.which;

                if(key === 13) {
                    if(document.getElementById('chatbox').classList.contains('active')) {
                        app.hideChat();
                    } else {
                        app.showChat();
                    }
                }
            });

            document.getElementById('chatinput').addEventListener('keydown', function(e) {
                const key = e.which, chat = document.getElementById('chatinput');

                if(key === 13) {
                    if(chat.value !== '') {
                        if(game.player) {
                            game.say(chat.value);
                        }
                        chat.value = '';
                        app.hideChat();
                        document.getElementById('foreground').focus();
                        return false;
                    } else {
                        app.hideChat();
                        return false;
                    }
                }

                if(key === 27) {
                    app.hideChat();
                    return false;
                }
            });

            document.getElementById('nameinput').addEventListener('keypress', function(event) {
                const nameInput = document.getElementById('nameinput'), name = nameInput.getAttribute('value');

                if(event.keyCode === 13) {
                    if(name !== '') {
                        app.tryStartingGame(name, function() {
                            nameInput.blur(); // exit keyboard on mobile
                        });
                        return false; // prevent form submit
                    } else {
                        return false; // prevent form submit
                    }
                }
            });

            document.getElementById('mutebutton').addEventListener('click', function() {
                game.audioManager.toggle();
            });

            document.addEventListener("keydown", function(e) {
            	const key = e.which, chat = document.getElementById('chatinput');

                if(document.activeElement !== document.getElementById('chatinput') && document.activeElement !== document.getElementById('nameinput')) {
                    if(key === 13) { // Enter
                        if(game.ready) {
                            chat.focus();
                            return false;
                        }
                    }
                    if(key === 32) { // Space
                        // game.togglePathingGrid();
                        return false;
                    }
                    if(key === 70) { // F
                        // game.toggleDebugInfo();
                        return false;
                    }
                    if(key === 27) { // ESC
                        app.hideWindows();
                        Object.values(game.player.attackers).forEach(function(attacker) {
                            attacker.stop();
                        });
                        return false;
                    }
                    if(key === 65) { // a
                        // game.player.hit();
                        return false;
                    }
                } else {
                    if(key === 13 && game.ready) {
                        chat.focus();
                        return false;
                    }
                }
            });

            if(game.renderer.tablet) {
                document.body.classList.add('tablet');
            }
    };

    initApp();
