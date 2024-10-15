const { validateWSD, validateWST } = require("../utils/functions");
const WebSocket = require('ws');

/**
 * Handle WebSocket connection.
 * 
 * @param {WebSocket} client - The WebSocket client connection instance.
 */

var connection = 0;
function handelWSC(client, wss) {
    console.log("Connection from client...");

    client.onmessage = async (clientMessage) => {
        const [isBodyValid, message] = await validateWSD(clientMessage.data, client); // Validating message syntax comming from client
        if(isBodyValid == false){
            client.send("Invalid json");
            client.close();
            return
        };
        const isTokenValid = await validateWST(message.token);
        if(isTokenValid == false){
            client.send("Invalid token");
            client.close();
            return
        }
    };

    client.onclose = () => {
        console.log("A client disconnected")
    }
}

exports.handelWSC = handelWSC;
