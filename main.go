package main

import (
	"log"
	"os"

	"github.com/ccoverstreet/Jarmuz-Status/app"
)

func main() {
	log.Println("")

	JablkoCorePort := os.Getenv("JABLKO_CORE_PORT")
	JMODPort := os.Getenv("JABLKO_MOD_PORT")
	JMODKey := os.Getenv("JABLKO_MOD_KEY")
	JMODDataDir := os.Getenv("JABLKO_MOD_DATA_DIR")
	JMODConfig := os.Getenv("JABLKO_MOD_CONFIG")

	app.StatusApp{}
}
