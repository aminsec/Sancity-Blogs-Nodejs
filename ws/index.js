const { validateWSM, validateWST } = require("../utils/functions");
const { v4: uuidv4 } = require("uuid");
const WebSocket = require('ws');

/**
 * Handle WebSocket connection.
 * 
 * @param {WebSocket} client - The WebSocket client connection instance.
 */

async function handelWSC(client, wss) {
    console.log("Connection from client...");
    const clientToken = client.protocol; // getting the auth-token via Sec-WebSocket-Protocol header
    const [isValidToken, userInfo] = await validateWST(clientToken); //Validating client token and get userInfo if it's valid
    if(isValidToken == false){
        client.send("Invalid token");
        client.close(); //Closing connection if token is not valid
        return
    };

    // Set up a ping-pong mechanism
    const interval = setInterval(() => {
    if (client.readyState === 1) {
        client.ping(); // Send a ping to the client
    }
  }, 10000); // Ping every 10 seconds
    //Extracting username from token and assiging it to its connection to keep tracking
    const clientUsername = userInfo.username;
    client.id = clientUsername;

    client.onmessage = async (clientMessage) => {
        //Sending Message - We should validate user message type and their token on each message, Otherwise there's gonna be a security bug
        const [isValidMessageAndToken, message] = await validateWSM(clientMessage.data);
        if(isValidMessageAndToken == false){
            client.send("Invalid message or token");
            return
        };
        
        wss.clients.forEach(cl => {
            if(cl.id == message.to){
                console.log(cl.id + " is " + message.to);
                if(cl.readyState == 1){
                    cl.send(message.message)
                }
            }else{
                console.log("nah")
            }
        });


    };

    client.onclose = () => {
        clearInterval(interval);
        console.log("A client disconnected");
    }
}

exports.handelWSC = handelWSC;
