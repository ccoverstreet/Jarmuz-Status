package app

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type StatusApp struct {
	PortHTTP   string             `json:"-"`
	Devices    []string           `json:"devices"`
	SaveConfig func([]byte) error `json:"-"`
	router     *mux.Router
}

var defaultConfig []byte = []byte(`
{
	"devices": ["10.0.0.40"]	
}
`)

func wrapperSaveConfig(JMODPort, JMODKey, JablkoCorePort string) func([]byte) error {
	return func(config []byte) error {
		client := &http.Client{}
		reqPath := "http://localhost:" + JablkoCorePort + "/service/saveConfig"

		req, err := http.NewRequest("POST", reqPath, bytes.NewBuffer(config))
		if err != nil {
			return err
		}

		req.Header.Add("JMOD-KEY", JMODKey)
		req.Header.Add("JMOD-PORT", JMODPort)

		_, err = client.Do(req)

		return err
	}
}

func CreateStatusApp(config string, JMODPort string, JMODKey string, JablkoCorePort string) *StatusApp {
	app := &StatusApp{}
	app.SaveConfig = wrapperSaveConfig(JMODPort, JMODKey, JablkoCorePort)
	app.PortHTTP = JMODPort

	log.Println(config)

	// If no config is provided
	// Should initialize with default config and save config
	if len(config) < 5 {
		err := app.SaveConfig(defaultConfig)
		if err != nil {
			log.Println("Unable to save default config")
			log.Println(err)
			panic(err)
		}
	} else {
		err := json.Unmarshal([]byte(config), &app)
		if err != nil {
			log.Println("Unable to use provided config")
			log.Println(err)
			panic(err)
		}
	}

	app.router = mux.NewRouter()
	app.router.HandleFunc("/webComponent", app.HandleWebComponent)
	app.router.HandleFunc("/instanceData", app.HandleInstanceData)
	app.router.HandleFunc("/jmod/clientWebsocket", app.HandleClientWebsocket)

	return app
}

func (app *StatusApp) Run() {
	log.Println("Jarmuz Status listening...")
	http.ListenAndServe(":"+app.PortHTTP, app.router)
}

func (app *StatusApp) HandleWebComponent(w http.ResponseWriter, r *http.Request) {
	b, err := ioutil.ReadFile("./webcomponent.js")
	if err != nil {
		return
	}

	fmt.Fprintf(w, "%s", b)
}

func (app *StatusApp) HandleInstanceData(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, `[{}, {}]`)
}

var upgrader = websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}

func (app *StatusApp) HandleClientWebsocket(w http.ResponseWriter, r *http.Request) {
	log.Println("Client connecting to live view...")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	conn.WriteMessage(1, []byte("Hello"))

	for {
		messageType, message, err := conn.ReadMessage()
		log.Println(messageType, message)
		if err != nil {
			log.Println("Error reading client")
			return
		}
	}
}

// Sometimes it's just too easy
