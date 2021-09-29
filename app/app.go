package app

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
)

type connList struct {
	sync.Mutex
	Conns []*websocket.Conn
}

type StatusApp struct {
	PortHTTP      string   `json:"-"`
	Devices       []string `json:"devices"`
	status        []bool
	SaveConfig    func([]byte) error `json:"-"`
	router        *mux.Router
	connList      connList
	statusSummary []byte // Stored as JSON
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

	app.statusSummary = []byte("[]")

	return app
}

func (app *StatusApp) Run() {
	go app.Poll()
	log.Println("Jarmuz Status listening...")
	http.ListenAndServe(":"+app.PortHTTP, app.router)
}

func (app *StatusApp) Poll() {
	for {

		type statusInfo struct {
			IP       string
			IsOnline bool
		}

		outputData := make([]statusInfo, len(app.Devices))

		wg := sync.WaitGroup{}
		wg.Add(len(app.Devices))

		for i, device := range app.Devices {
			go func(id int, device string, wg *sync.WaitGroup) {
				defer wg.Done()
				outputData[id] = statusInfo{device, Ping(device)}
				log.Println(device, id)
			}(i, device, &wg)
		}

		wg.Wait()
		summary, err := json.Marshal(outputData)
		if err != nil {
			log.Printf("ERROR: Unable to marshal status output - %v\n", err)
			return
		}

		app.statusSummary = summary
		log.Println(string(app.statusSummary))

		app.PushConnections()

		time.Sleep(5 * time.Second)
	}
}

func Ping(ipAddress string) bool {
	_, err := net.DialTimeout("tcp", ipAddress+":80", time.Duration(3*time.Second))
	if err != nil {
		return false

	}

	return true
}

func (app *StatusApp) HandleWebComponent(w http.ResponseWriter, r *http.Request) {
	b, err := ioutil.ReadFile("./webcomponent.js")
	if err != nil {
		return
	}

	fmt.Fprintf(w, "%s", b)
}

func (app *StatusApp) HandleInstanceData(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, `[{}]`)
}

var upgrader = websocket.Upgrader{CheckOrigin: func(*http.Request) bool { return true }}

func (app *StatusApp) HandleClientWebsocket(w http.ResponseWriter, r *http.Request) {
	log.Println("Client connecting to live view...")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	app.addConnection(conn)

	conn.WriteMessage(1, app.statusSummary)

	for {
		messageType, message, err := conn.ReadMessage()
		log.Println(messageType, message)
		if err != nil {
			log.Println("Error reading client")
			return
		}
	}
}

func (app *StatusApp) addConnection(conn *websocket.Conn) {
	app.connList.Lock()
	defer app.connList.Unlock()

	app.connList.Conns = append(app.connList.Conns, conn)
}

// Pushs connection list and status to all connected clients
func (app *StatusApp) PushConnections() {
	app.connList.Lock()
	defer app.connList.Unlock()

	log.Println(app.connList.Conns)

	delMap := make(map[int]struct{})

	for i, conn := range app.connList.Conns {
		err := conn.WriteMessage(1, app.statusSummary)
		if err != nil { // {
			delMap[i] = struct{}{}
		}
	}

	app.connList.Conns = removeConns(app.connList.Conns, delMap)
}

func removeConns(conns []*websocket.Conn, indices map[int]struct{}) []*websocket.Conn {
	if len(indices) == 0 {
		return conns
	}

	size := len(conns) - len(indices)
	ret := make([]*websocket.Conn, size)
	insert := 0

	for i, conn := range conns {
		log.Println("ENTRY", i, conn)
		if _, ok := indices[i]; ok {
			continue
		}

		conns[insert] = conn
		insert = insert + 1
	}

	return ret
}

// Sometimes it's just too easy
