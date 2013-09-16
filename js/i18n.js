var Locale = function (loc) {
    var that = {};
    var defaultLocale = "en-US";
    var allowedLocales = ["fr", "en-US", "es"];

    var locale = (allowedLocales.indexOf(loc) !== -1) ? loc : defaultLocale;


    var dic = {
        "bikes"     : {
                        "fr"   : "vélos",
                        "en-US"   : "bikes",
                        "es"   : "bicis"
                    },
        "stands"    : {
                        "fr"   : "emplacements",
                        "en-US"   : "stands",
                        "es"   : "aparcamientos"
                    },
        "title"     : {
                        "fr"   : "Vélos partagés",
                        "en-US"   : "Bike sharing",
                        "es"   : "Bicicletas compartidas"
                    },
        "cityChoice"    : {
                        "fr"   : "Sélectionner votre ville:",
                        "en-US": "Choose your city:",
                        "es"   : "Elige su ciudad:"
                    },
        "settingCanvas" : {
                        "fr"   : "Canvas: ",
                        "en-US": "Canvas: ",
                        "es"   : "Canvas: "
                    },
        "settingMaxPoint" : {
                        "fr"   : "Maximum de point: ",
                        "en-US": "Max points: ",
                        "es"   : "Máximo de puntos: "
                    },
        "contribute" : {
                        "fr"   : "Contribuez à ce projet sur ",
                        "en-US": "Contribute to this project at ",
                        "es"   : "Contribuye a este proyecto en "
                    },
        "Paris" : {
                        "fr"   : "Paris",
                        "en-US": "Paris",
                        "es"   : "París"
                    },
        "Nantes" : {
                        "fr"   : "Nantes",
                        "en-US": "Nantes",
                        "es"   : "Nantes"
                    },
        "Valencia" : {
                        "fr"   : "Valence (Espagne)",
                        "en-US": "Valencia",
                        "es"   : "Valencia"
                    }
        };

    that.localize = function () {
        for (var key in dic) {
            var set = document.querySelectorAll(".i18n-" + key);
            for (var i=0; i<set.length;i++) {
                if (dic[key][locale]) {
                    set[i].textContent = dic[key][locale];
                }
            }
        }
    };

    that.setLocale = function (loc) {
        locale = allowedLocales.indexOf(loc) != -1 ? loc : defaultLocale;
    };

    that.getString = function(key) {
        if (dic[key]) {
            return dic[key][locale] || "";
        } else {
            return "Key not found";
        }
    };

    return that;
};