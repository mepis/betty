# MariaDB and phpMyAdmin Integration Scripts

These scripts are designed to automate the installation of MariaDB and phpMyAdmin on Ubuntu or Debian systems.

## Available Scripts

- `install.sh`: An interactive script that allows you to choose what to install (MariaDB, phpMyAdmin, or both).
- `install_mariadb.sh`: Installs only MariaDB Server.
- `install_phpmyadmin.sh`: Installs phpMyAdmin along with necessary dependencies (Apache, PHP).

## Usage

### Using the interactive script (Recommended)
```bash
./install.sh
```

### Using individual scripts
To install MariaDB:
```bash
./install_mariadb.sh
```

To install phpMyAdmin:
```bash
./install_phpmyadmin.sh
```

## Note
- These scripts require `sudo` privileges.
- For phpMyAdmin, the script uses `debconf-set-selections` to automate the configuration.
