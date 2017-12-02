
//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http')
var path = require('path')

var async = require('async')
var socketio = require('socket.io')
var express = require('express')
var bodyParser = require('body-parser')
var request = require('request')

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express()
var server = http.createServer(router)
var io = socketio.listen(server)

router.use(express.static(path.resolve(__dirname, 'client')))
router.use(bodyParser.json())
router.use(bodyParser.urlencoded({ extended: false }))

var messages = []
var sockets = []

var _estado = []
var _telefone = []
var _email = []

router.get('/webhook', function (req, res) {
  if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === 'minhasenha123') {
      console.log('Validação ok!')
      res.status(200).send(req.query['hub.challenge'])
    } else {
      console.log('Validação falhou!')
      res.sendStatus(403)
    }
})

router.post('/webhook', function (req, res) {
  var data = req.body

  if (data && data.object === 'page') {
        // PERCORRER TODAS AS ENTRADAS (ENTRY)
      data.entry.forEach(function (entry) {
          var pageID = entry.id
          var timeOffEvent = entry.time

            // PERCORRER TODAS AS MENSAGENS
          entry.messaging.forEach(function (event) {
              if (event.message) {
                  trataMensagem(event)
                } else {
                  if (event.postback && event.postback.payload) {
                      switch (event.postback.payload) {
                          case 'clicou_comecar':
                            sendTextMessage(event.sender.id, 'Você clicou em começar')
                            sendFirstMenu(event.sender.id)
                            break

                          default:
                            // code
                        }
                    }
                }
            })
        })

      res.sendStatus(200)
    }
})

function trataMensagem (event) {
  var senderID = event.sender.id
  var recipientID = event.recipient.id
  var timeOffMessage = event.timestamp
  var message = event.message

    // console.log('Mensagem recebida do usuário %d pela página %d', senderID, recipientID);

  var messageID = message.mid
  var messageText = message.text
  var attachments = message.attachments

  if (messageText) {
      switch (messageText) {
          case 'Começar':
            sendTextMessage(senderID, 'Se você preferir pode falar conosco diretamente pelo telefone e WhatsApp 11 99623-9342')
            setTimeout(function () {
                  resposta_rapida(senderID, 'Vamos lá! Você precisa de muitos uniformes para a sua empresa ou poucas unidades para uso pessoal?', 'Para minha empresa', 'Para uso pessoal')
                }, 1500)
            break

            case 'Para minha empresa':
          case 'Para uso pessoal':
            resposta_rapida_3(senderID)
            break

            case 'Masculino':
          case 'Feminino':
          case 'Ambos':
            resposta_rapida(senderID, 'Você já tem um modelo ou design em mente para o seu uniforme?', 'Sim', 'Não')
            _estado[senderID] = 'foto_link'
            break

            case 'Sim':
            if (_estado[senderID] === 'foto_link') {
                  resposta_rapida(senderID, 'Pode nos enviar uma foto ou link do modelo desejado?', 'Sim', 'Não')
                  _estado[senderID] = 'esperando'
                  break
                }

          case 'Não':
            if (_estado[senderID] === 'foto_link') {
                  sendTextMessage(senderID, 'Excelente! Agora para finalizar preciso do seu telefone para que um de nossos consultores te apresente o melhor orçamento. Digite seu telefone com DDD')
                  _estado[senderID] = 'telefone'
                }

          default:
                // ENVIAR MENSAGEM PADRÃO

            if (_estado[senderID] === 'esperando' && messageText != 'Sim') {
                  sendTextMessage(senderID, 'Excelente! Agora para finalizar preciso do seu telefone para que um de nossos consultores te apresente o melhor orçamento. Digite seu telefone com DDD')
                  _estado[senderID] = 'telefone'
                }

            if (_estado[senderID] === 'email') {
                  var valida_email = messageText.search('@')
                  if (valida_email === -1) {
                      sendTextMessage(senderID, 'Oops. Parece que esse email não existe. Tem certeza que digitou corretamente?')
                      break
                    } else {
                      sendTextMessage(senderID, 'Muito obrigado pelas informações. Em breve entraremos em contato com maiores informações. Precisa de mais alguma coisa?')
                      _telefone[senderID] = messageText
                      _estado[senderID] = ''
                        break
                    }
                }

            if (_estado[senderID] === 'valida_telefone') {
                  var valida_telefone = messageText.length
                  if (valida_telefone > 13 || valida_telefone < 8) {
                      sendTextMessage(senderID, 'Oops. Parece que esse telefone não existe. Tem certeza que digitou corretamente?')
                      break
                    } else {
                      sendTextMessage(senderID, 'Caso não consigamos falar com você por telefone, nos diga qual o seu e-mail para contato')
                      setTimeout(function () {
                        }, 1500)
                      _estado[senderID] = 'email'
                      break
                    }
                }

            if (_estado[senderID] === 'telefone') {
                  _estado[senderID] = 'valida_telefone'
                }
        }
    } else if (attachments) {
        // TRATAMENTO DOS ANEXOS
      sendTextMessage(senderID, 'Excelente! Agora para finalizar preciso do seu telefone para que um de nossos consultores te apresente o melhor orçamento. Digite seu telefone com DDD')
      _estado[senderID] = 'valida_telefone'
    }
}

function sendTextMessage (recipientID, messageText) { // Função de enviar texto
  var messageData = {
      recipient: {
          id: recipientID
        },

      message: {
          text: messageText
        }
    }

  callSendAPI(messageData)
}

function sendFirstMenu (recipientID) { // Função do enviar botão
  var messageData = {
      recipient: {
          id: recipientID
        },

      message: {
          attachment: {
              type: 'template',
              payload: {
                  template_type: 'button',
                  text: 'O que você procura?',
                  buttons: [{
                      type: 'postback',
                      title: 'Ver produtos',
                      payload: 'clicou_ver_produtos'
                    }]
                }
            }
        }
    }

  callSendAPI(messageData)
}

function resposta_rapida (recipientID, texto_cima, text1, text2) { // Função do enviar resposta rapida
  var messageData = {
      recipient: {
          id: recipientID
        },

      message: {
          text: texto_cima,
          quick_replies: [
              {
                content_type: 'text',
                title: text1,
                payload: ''
              },
              {
                content_type: 'text',
                title: text2,
                payload: ''
              }]
        }
    }

  callSendAPI(messageData)
}

function mandar_imagem (recipientID) {
  var messageData = {
      recipient: {
          id: recipientID
        },

      message: {
          attachment: {
              type: 'image',
              payload: {
                  url: 'http://pgl.gal/wp-content/uploads/2014/08/bola-de-futebol.jpg',
                  is_reusable: true
                }
            }
        }
    }

  callSendAPI(messageData)
}

function resposta_rapida_3 (recipientID) { // Função do enviar resposta rapida
  var messageData = {
      recipient: {
          id: recipientID
        },

      message: {
          text: 'Ótimo! Você está buscando modelos masculinos, femininos ou ambos?',
          quick_replies: [
              {
                content_type: 'text',
                title: 'Masculino',
                payload: ''
              },
              {
                content_type: 'text',
                title: 'Feminino',
                payload: ''
              },
              {
                content_type: 'text',
                title: 'Ambos',
                payload: ''
              }
            ]
        }
    }

  callSendAPI(messageData)
}

function callSendAPI (messageData) {
  request({
      uri: 'https://graph.facebook.com/v2.6/me/messages',
      qs: { access_token: 'EAAH1ramxxaIBAJnOdixNH3J85pqW1H5nvs3z2lZBr8ZAMdPayZCyRRZCYTuCyBtQ28NtSCrtGOUdZBO3Pe5RvOGDr1ALO6c0NVj14ckVWP3PyRVAu3Yf0sjUHaHi46kOMa2ZCu6YTB7PYJaw6TrCwJSFvaWC06yxDILspFdbJd9wZDZD' },
      method: 'POST',
      json: messageData
    }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
          console.log('Mensagem enviada com sucesso')
          var recipientID = body.recipient_id // pra quem realmente foi enviada a msg se quiser posso dar um console.log
        } else {
          console.log('Não foi possivel enviar a mensagem')
          console.log(error)
        }
    })
}

io.on('connection', function (socket) {
  messages.forEach(function (data) {
      socket.emit('message', data)
    })

  sockets.push(socket)

  socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1)
      updateRoster()
    })

  socket.on('message', function (msg) {
      var text = String(msg || '')

      if (!text) { return }

      socket.get('name', function (err, name) {
          var data = {
              name: name,
              text: text
            }

          broadcast('message', data)
          messages.push(data)
        })
    })

  socket.on('identify', function (name) {
      socket.set('name', String(name || 'Anonymous'), function (err) {
          updateRoster()
        })
    })
})

function updateRoster () {
  async.map(
        sockets,
        function (socket, callback) {
          socket.get('name', callback)
        },
        function (err, names) {
          broadcast('roster', names)
        }
    )
}

function broadcast (event, data) {
  sockets.forEach(function (socket) {
      socket.emit(event, data)
    })
}

server.listen(process.env.PORT || 3000, process.env.IP || '0.0.0.0', function () {
  var addr = server.address()
  console.log('Chat server listening at', addr.address + ':' + addr.port)
})
