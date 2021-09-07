package app

type StatusApp struct {
	PortHTTP string   `json:"-"`
	Devices  []string `json:"devices"`
}

func CreateStatusApp(config string, JMODPort string, JMODKey string) *StatusApp {

}
