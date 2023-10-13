const CryptoJS = require("crypto-js");
const config = require('config');
const crypto = require('../helpers/admin/crypto')

module.exports = {

  crypto_check(crypto_check_params) {
      
    // console.log(crypto_check_params)
    crypto_check_params = crypto_check_params || {};

    // crypto_check_params = Object.assign({
    //     polling_timeout: 3 * 1000 // 3 sec
    //   },
    //   crypto_check_params
    // );

    return function (req, res, next) {
      if (config.securePolling == 0) {
        next();
        return;
      }
      if (!req.session ||
        !req.session.s_tokens ||
        !req.session.s_tokens[req.query.s_token]) {
        res.status(401).json({
          status: 999,
          error: "Not registered"
        });
        return;
      }
      const s_token = req.query.s_token;
      const s_token_object = req.session.s_tokens[s_token];
      const s_token_key = s_token_object.s_token_key;


      const key = req.method + "-" + req.baseUrl + req.path;

      if (!s_token_object[key]) {
        s_token_object[key] = {}
      }

      const s_token_object_by_url = s_token_object[key];

      try {

        const auth = decodeURIComponent(req.query.auth);

        const auth_bytes = CryptoJS.AES.decrypt(auth, s_token_key);
        const auth_decrypted = auth_bytes.toString(CryptoJS.enc.Utf8).split("|");

        // console.log("++++++")
        // console.log(req.session)

        const auth_ts = parseInt(auth_decrypted[0]);
        const auth_s_token = auth_decrypted[1]

        if (auth_s_token !== s_token) {
          res.status(401).json({
            error: "Not registered"
          });
          return;
        }

        if (s_token_object_by_url.lts && s_token_object_by_url.lts >= auth_ts) {
          res.status(401).json({
            error: "Don't try to hack us123!"
          });
          return;
        }

        s_token_object_by_url.lts = auth_ts;
      } catch (e) {
        res.status(401).json({
          error: "Not registered. Error."
        });
        return;
      }
      if (crypto_check_params.polling_timeout) {

        // console.log('=========')
        //console.log(s_token_object_by_url)

        const time = new Date().getTime();
        //console.log(time - s_token_object_by_url.lts ,time - s_token_object_by_url.ts , crypto_check_params.polling_timeout*10)
        // if (s_token_object_by_url.ts && time - s_token_object_by_url.ts > crypto_check_params.polling_timeout * 10) {
        //   delete req.session.s_tokens[s_token];
        //   res.status(401).json({
        //     error: "Timeout failed, please update the page"
        //   });
        //   return;
        // }

        s_token_object_by_url.ts = time;

      }

      next();
    };
  },

  decryptRequest(req, res, next) {
    req.body = crypto.decrypt(req.body)
    return next()
  }


}

