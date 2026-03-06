import log from './lib/log.js';
import { TRANSITIONEND } from './util.js';
import Storage from './storage.js';
import { resolveSprite } from './asset-resolver.js';

    class App {
        constructor() {
            this._playDivHandler = null;
            this.currentPage = 1;
            this.blinkInterval = null;
            this.previousState = null;
            this.isParchmentReady = true;
            this.ready = false;
            this.storage = new Storage();
            this.watchNameInputInterval = setInterval(this.toggleButton.bind(this), 100);
            this.playButtons = document.querySelectorAll('.play');
            this.playDivs = document.querySelectorAll('.play div');
        }

        setGame(game) {
            this.game = game;
            this.isMobile = this.game.renderer.mobile;
            this.isTablet = this.game.renderer.tablet;
            this.isDesktop = !(this.isMobile || this.isTablet);
            this.supportsWorkers = !!window.Worker;
            this.ready = true;
        }

        center() {
            window.scrollTo(0, 1);
        }

        canStartGame() {
            if(this.isDesktop) {
                return (this.game && this.game.map && this.game.map.isLoaded);
            } else {
                return this.game;
            }
        }

        tryStartingGame(username, starting_callback) {
            const self = this;

            if(username !== '') {
                if(!this.ready || !this.canStartGame()) {
                    if(!this.isMobile) {
                        // on desktop and tablets, add a spinner to the play button
                        this.playButtons.forEach(function(el) { el.classList.add('loading'); });
                    }
                    this._unbindPlayDiv();
                    const watchCanStart = setInterval(function() {
                        log.debug("waiting...");
                        if(self.canStartGame()) {
                            setTimeout(function() {
                                if(!self.isMobile) {
                                    self.playButtons.forEach(function(el) { el.classList.remove('loading'); });
                                }
                            }, 1500);
                            clearInterval(watchCanStart);
                            self.startGame(username, starting_callback);
                        }
                    }, 100);
                } else {
                    this._unbindPlayDiv();
                    this.startGame(username, starting_callback);
                }
            }
        }

        _unbindPlayDiv() {
            if(this._playDivHandler) {
                this.playDivs.forEach(function(el) { el.removeEventListener('click', this._playDivHandler); }.bind(this));
                this._playDivHandler = null;
            }
        }

        _bindPlayDiv(fn) {
            this._unbindPlayDiv();
            this._playDivHandler = fn;
            this.playDivs.forEach(function(el) { el.addEventListener('click', fn); });
        }

        startGame(username, starting_callback) {
            const self = this;

            if(starting_callback) {
                starting_callback();
            }
            this.hideIntro(function() {
                if(!self.isDesktop) {
                    // On mobile and tablet we load the map after the player has clicked
                    // on the PLAY button instead of loading it in a web worker.
                    self.game.loadMap();
                }
                self.start(username);
            });
        }

        start(username) {
            const self = this, firstTimePlaying = !self.storage.hasAlreadyPlayed();

            if(username && !this.game.started) {
                this.game.setServerOptions("localhost", 8000, username);

                this.center();
                this.game.run(function() {
                    document.body.classList.add('started');
                	if(firstTimePlaying) {
                	    self.toggleInstructions();
                	}
            	});
            }
        }

        setMouseCoordinates(event) {
            const gamePos = document.getElementById('container').getBoundingClientRect(),
                  scale = this.game.renderer.getScaleFactor(),
                  width = this.game.renderer.getWidth(),
                  height = this.game.renderer.getHeight(),
                  mouse = this.game.mouse;

            mouse.x = event.pageX - (gamePos.left + window.pageXOffset) - (this.isMobile ? 0 : 5 * scale);
        	mouse.y = event.pageY - (gamePos.top + window.pageYOffset) - (this.isMobile ? 0 : 7 * scale);

        	if(mouse.x <= 0) {
        	    mouse.x = 0;
        	} else if(mouse.x >= width) {
        	    mouse.x = width - 1;
        	}

        	if(mouse.y <= 0) {
        	    mouse.y = 0;
        	} else if(mouse.y >= height) {
        	    mouse.y = height - 1;
        	}
        }

        initHealthBar() {
            const scale = this.game.renderer.getScaleFactor(),
                  healthMaxWidth = document.getElementById('healthbar').offsetWidth - (12 * scale);

        	this.game.onPlayerHealthChange(function(hp, maxHp) {
        	    const barWidth = Math.round((healthMaxWidth / maxHp) * (hp > 0 ? hp : 0));
        	    document.getElementById('hitpoints').style.width = barWidth + "px";
        	});

        	this.game.onPlayerHurt(this.blinkHealthBar.bind(this));
        }

        blinkHealthBar() {
            const hitpoints = document.getElementById('hitpoints');

            hitpoints.classList.add('white');
            setTimeout(function() {
                hitpoints.classList.remove('white');
            }, 500)
        }

        toggleButton() {
            const name = document.getElementById('nameinput').value,
                  play = document.querySelector('#createcharacter .play');

            if(name && name.length > 0) {
                play.classList.remove('disabled');
                document.getElementById('character').classList.remove('disabled');
            } else {
                play.classList.add('disabled');
                document.getElementById('character').classList.add('disabled');
            }
        }

        hideIntro(hidden_callback) {
            clearInterval(this.watchNameInputInterval);
            document.body.classList.remove('intro');
            setTimeout(function() {
                document.body.classList.add('game');
                hidden_callback();
            }, 1000);
        }

        showChat() {
            if(this.game.started) {
                this.hideWindows();
                document.getElementById('chatbox').classList.add('active');
                document.getElementById('chatinput').focus();
                document.getElementById('chatbutton').classList.add('active');
            }
        }

        hideChat() {
            if(this.game.started) {
                document.getElementById('chatbox').classList.remove('active');
                document.getElementById('chatinput').blur();
                document.getElementById('chatbutton').classList.remove('active');
            }
        }

        toggleInstructions() {
            this.hideChat();
            if(document.getElementById('achievements').classList.contains('active')) {
        	    this.toggleAchievements();
        	    document.getElementById('achievementsbutton').classList.remove('active');
        	}
        	if(document.body.classList.contains('credits')) {
        	    this.closeInGameCredits();
        	}
        	if(document.body.classList.contains('about')) {
        	    this.closeInGameAbout();
        	}
            document.getElementById('instructions').classList.toggle('active');
        }

        toggleAchievements() {
            this.hideChat();
        	if(document.getElementById('instructions').classList.contains('active')) {
        	    this.toggleInstructions();
        	    document.getElementById('helpbutton').classList.remove('active');
        	}
        	if(document.body.classList.contains('credits')) {
        	    this.closeInGameCredits();
        	}
        	if(document.body.classList.contains('about')) {
        	    this.closeInGameAbout();
        	}
            this.resetPage();
            document.getElementById('achievements').classList.toggle('active');
        }

        resetPage() {
            const self = this,
                  achievements = document.getElementById('achievements');

            if(achievements.classList.contains('active')) {
                const handler = function() {
                    achievements.classList.remove('page' + self.currentPage);
                    achievements.classList.add('page1');
                    self.currentPage = 1;
                    achievements.removeEventListener(TRANSITIONEND, handler);
                };
                achievements.addEventListener(TRANSITIONEND, handler);
            }
        }

        initEquipmentIcons() {
            const scale = this.game.renderer.getScaleFactor();
            const getIconPath = function(spriteName) {
                          return resolveSprite('item-' + spriteName, scale);
                      },
                  weapon = this.game.player.getWeaponName(),
                  armor = this.game.player.getSpriteName(),
                  weaponPath = getIconPath(weapon),
                  armorPath = getIconPath(armor);

            document.getElementById('weapon').style.backgroundImage = 'url("' + weaponPath + '")';
            if(armor !== 'firefox') {
                document.getElementById('armor').style.backgroundImage = 'url("' + armorPath + '")';
            }
        }

        hideWindows() {
            if(document.getElementById('achievements').classList.contains('active')) {
        	    this.toggleAchievements();
        	    document.getElementById('achievementsbutton').classList.remove('active');
        	}
        	if(document.getElementById('instructions').classList.contains('active')) {
        	    this.toggleInstructions();
        	    document.getElementById('helpbutton').classList.remove('active');
        	}
        	if(document.body.classList.contains('credits')) {
        	    this.closeInGameCredits();
        	}
        	if(document.body.classList.contains('about')) {
        	    this.closeInGameAbout();
        	}
        }

        showAchievementNotification(id, name) {
            const notif = document.getElementById('achievement-notification'),
                  nameEl = notif.querySelector('.name'),
                  button = document.getElementById('achievementsbutton');

            notif.className = 'active achievement' + id;
            nameEl.textContent = name;
            if(this.game.storage.getAchievementCount() === 1) {
                this.blinkInterval = setInterval(function() {
                    button.classList.toggle('blink');
                }, 500);
            }
            setTimeout(function() {
                notif.classList.remove('active');
                button.classList.remove('blink');
            }, 5000);
        }

        displayUnlockedAchievement(id) {
            const achievement = document.querySelector('#achievements li.achievement' + id);
            if(!achievement) return;

            const achievementData = this.game.getAchievementById(id);
            if(achievementData && achievementData.hidden) {
                this.setAchievementData(achievement, achievementData.name, achievementData.desc);
            }
            achievement.classList.add('unlocked');
        }

        unlockAchievement(id, name) {
            this.showAchievementNotification(id, name);
            this.displayUnlockedAchievement(id);

            const unlockedEl = document.getElementById('unlocked-achievements');
            const nb = parseInt(unlockedEl.textContent);
            unlockedEl.textContent = nb + 1;
        }

        initAchievementList(achievements) {
            const self = this;
            const lists = document.getElementById('lists');
            const pageTmpl = document.getElementById('page-tmpl');
            const achievementTmpl = document.getElementById('achievement-tmpl');
            let page = 0;
            let count = 0;
            let p = null;

            Object.values(achievements).forEach(function(achievement) {
                count++;

                const a = achievementTmpl.cloneNode(true);
                a.removeAttribute('id');
                a.classList.add('achievement'+count);
                if(!achievement.hidden) {
                    self.setAchievementData(a, achievement.name, achievement.desc);
                }
                a.querySelector('.twitter').setAttribute('href', 'http://twitter.com/share?url=http%3A%2F%2Fbrowserquest.mozilla.org&text=I%20unlocked%20the%20%27'+ achievement.name +'%27%20achievement%20on%20Mozilla%27s%20%23BrowserQuest%21&related=glecollinet:Creators%20of%20BrowserQuest%2Cwhatthefranck');
                a.style.display = '';
                a.querySelector('a').addEventListener('click', function(event) {
                     const url = this.getAttribute('href');

                    self.openPopup('twitter', url);
                    event.preventDefault();
                    return false;
                });

                if((count - 1) % 4 === 0) {
                    page++;
                    p = pageTmpl.cloneNode(true);
                    p.id = 'page'+page;
                    p.style.display = '';
                    lists.appendChild(p);
                }
                p.appendChild(a);
            });

            document.getElementById('total-achievements').textContent = document.querySelectorAll('#achievements li').length;
        }

        initUnlockedAchievements(ids) {
            const self = this;

            ids.forEach(function(id) {
                self.displayUnlockedAchievement(id);
            });
            document.getElementById('unlocked-achievements').textContent = ids.length;
        }

        setAchievementData(el, name, desc) {
            el.querySelector('.achievement-name').innerHTML = name;
            el.querySelector('.achievement-description').innerHTML = desc;
        }

        toggleCredits() {
            const parchment = document.getElementById('parchment');
            const currentState = parchment.getAttribute('class');

            if(this.game.started) {
                this.hideChat();
                if(document.getElementById('achievements').classList.contains('active')) {
                    this.toggleAchievements();
                    document.getElementById('achievementsbutton').classList.remove('active');
                }
                if(document.getElementById('instructions').classList.contains('active')) {
                    this.toggleInstructions();
                    document.getElementById('helpbutton').classList.remove('active');
                }
                parchment.className = 'credits';

                document.body.classList.toggle('credits');

                if(!this.game.player) {
                    document.body.classList.toggle('death');
                }
                if(document.body.classList.contains('about')) {
                    this.closeInGameAbout();
                    document.getElementById('helpbutton').classList.remove('active');
                }
            } else {
                if(currentState !== 'animate') {
                    if(currentState === 'credits') {
                        this.animateParchment(currentState, this.previousState);
                    } else {
            	        this.animateParchment(currentState, 'credits');
            	        this.previousState = currentState;
            	    }
                }
            }
        }

        toggleAbout() {
            const parchment = document.getElementById('parchment');
            const currentState = parchment.getAttribute('class');

            if(this.game.started) {
                this.hideChat();
                if(document.getElementById('achievements').classList.contains('active')) {
                    this.toggleAchievements();
                    document.getElementById('achievementsbutton').classList.remove('active');
                }
                if(document.getElementById('instructions').classList.contains('active')) {
                    this.toggleInstructions();
                }
                parchment.className = 'about';
                document.body.classList.toggle('about');
                if(!this.game.player) {
                    document.body.classList.toggle('death');
                }
                if(document.body.classList.contains('credits')) {
                    this.closeInGameCredits();
                }
            } else {
                if(currentState !== 'animate') {
                    if(currentState === 'about') {
                        if(localStorage && localStorage.data) {
                            this.animateParchment(currentState, 'loadcharacter');
                        } else {
                            this.animateParchment(currentState, 'createcharacter');
                        }
                    } else {
            	        this.animateParchment(currentState, 'about');
            	        this.previousState = currentState;
            	    }
                }
            }
        }

        closeInGameCredits() {
            document.body.classList.remove('credits');
            document.getElementById('parchment').classList.remove('credits');
            if(!this.game.player) {
                document.body.classList.add('death');
            }
        }

        closeInGameAbout() {
            document.body.classList.remove('about');
            document.getElementById('parchment').classList.remove('about');
            if(!this.game.player) {
                document.body.classList.add('death');
            }
            document.getElementById('helpbutton').classList.remove('active');
        }

        togglePopulationInfo() {
            document.getElementById('population').classList.toggle('visible');
        }

        openPopup(type, url) {
            const h = window.innerHeight;
            const w = window.innerWidth;
            let popupHeight;
            let popupWidth;
            let top;
            let left;

            switch(type) {
                case 'twitter':
                    popupHeight = 450;
                    popupWidth = 550;
                    break;
                case 'facebook':
                    popupHeight = 400;
                    popupWidth = 580;
                    break;
            }

            top = (h / 2) - (popupHeight / 2);
            left = (w / 2) - (popupWidth / 2);

            const newwindow = window.open(url,'name','height=' + popupHeight + ',width=' + popupWidth + ',top=' + top + ',left=' + left);
            if (window.focus && newwindow) {newwindow.focus()}
        }

        animateParchment(origin, destination) {
            const self = this;
            const parchment = document.getElementById('parchment');
            let duration = 1;

            if(this.isMobile) {
                parchment.classList.remove(origin);
                parchment.classList.add(destination);
            } else {
                if(this.isParchmentReady) {
                    if(this.isTablet) {
                        duration = 0;
                    }
                    this.isParchmentReady = !this.isParchmentReady;

                    parchment.classList.toggle('animate');
                    parchment.classList.remove(origin);

                    setTimeout(function() {
                        parchment.classList.toggle('animate');
                        parchment.classList.add(destination);
                    }, duration * 1000);

                    setTimeout(function() {
                        self.isParchmentReady = !self.isParchmentReady;
                    }, duration * 1000);
        	    }
            }
        }

        animateMessages() {
            const messages = document.querySelectorAll('#notifications div');

            messages.forEach(function(el) { el.classList.add('top'); });
        }

        resetMessagesPosition() {
            const message = document.getElementById('message2').textContent;

            document.querySelectorAll('#notifications div').forEach(function(el) { el.classList.remove('top'); });
            document.getElementById('message2').textContent = '';
            document.getElementById('message1').textContent = message;
        }

        showMessage(message) {
            const wrapper = document.querySelector('#notifications div'),
                  messageEl = document.getElementById('message2');

            this.animateMessages();
            messageEl.textContent = message;
            if(this.messageTimer) {
                this.resetMessageTimer();
            }

            this.messageTimer = setTimeout(function() {
                    wrapper.classList.add('top');
            }, 5000);
        }

        resetMessageTimer() {
            clearTimeout(this.messageTimer);
        }

        resizeUi() {
            if(this.game) {
                if(this.game.started) {
                    this.game.resize();
                    this.initHealthBar();
                    this.game.updateBars();
                } else {
                    const newScale = this.game.renderer.getScaleFactor();
                    this.game.renderer.rescale(newScale);
                }
            }
        }
    
    }

    export default App;
