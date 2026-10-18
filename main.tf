
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# ==========================================
# 1. PROVEEDOR AWS
# ==========================================

provider "aws" {
  region  = "us-east-2"
  profile = "diplo"
}

# ==========================================
# 2. CONFIGURACION LOCAL
# ==========================================

locals {
  # Cambiar si tu IP publica cambia
  my_ip = "166.114.163.22/32"
}

# ==========================================
# 3. RED AWS EXISTENTE
# ==========================================

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }

  filter {
    name   = "default-for-az"
    values = ["true"]
  }
}

# ==========================================
# 4. UBUNTU 24.04 LTS
# ==========================================

data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name = "name"
    values = [
      "ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"
    ]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# ==========================================
# 5. FIREWALL FRONTEND
# ==========================================

resource "aws_security_group" "frontend" {
  name_prefix = "asistencia-frontend-"
  description = "Firewall React - Diplomado"
  vpc_id      = data.aws_vpc.default.id

  # SSH solo desde tu IP publica
  ingress {
    description = "SSH personal"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = [local.my_ip]
  }

  # React accesible desde Internet
  ingress {
    description = "React HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Salida a Internet y comunicacion con NestJS
  egress {
    description = "Salida a Internet"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "sg-asistencia-frontend"
    Project = "Diplomado"
  }
}

# ==========================================
# 6. INSTANCIA EC2 REACT
# ==========================================

resource "aws_instance" "frontend" {
  ami           = data.aws_ami.ubuntu.id
  instance_type = "t3.micro"

  # Subred de la VPC predeterminada
  subnet_id = sort(data.aws_subnets.default.ids)[0]

  # IPv4 publica asignada automaticamente
  associate_public_ip_address = true

  # Key Pair existente en AWS Ohio
  key_name = "lab-2"

  vpc_security_group_ids = [
    aws_security_group.frontend.id
  ]

  # Evitar cargos adicionales por CPU Unlimited
  credit_specification {
    cpu_credits = "standard"
  }

  # Instalacion inicial de Nginx
  user_data = <<-EOF
    #!/bin/bash
    set -eux

    apt-get update
    apt-get install -y nginx

    # Carpeta que servira los archivos de React
    mkdir -p /var/www/react

    # Pagina provisional de prueba
    cat > /var/www/react/index.html <<'HTML'
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>React AWS</title>
    </head>
    <body>
      <h1>Frontend listo en AWS EC2</h1>
      <p>Nginx instalado con OpenTofu.</p>
    </body>
    </html>
    HTML

    # Configuracion Nginx para React SPA
    cat > /etc/nginx/sites-available/default <<'NGINX'
    server {
        listen 80;
        server_name _;

        root /var/www/react;
        index index.html;

        location / {
            try_files $uri $uri/ /index.html;
        }
    }
    NGINX

    # Activar Nginx
    systemctl enable nginx
    nginx -t
    systemctl restart nginx
  EOF

  # Almacenamiento
  root_block_device {
    volume_size           = 10
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  tags = {
    Name    = "ec2-asistencia-frontend"
    Project = "Diplomado"
  }
}

# ==========================================
# 7. OUTPUTS
# ==========================================

output "instance_id" {
  description = "Identificador de EC2 frontend"
  value       = aws_instance.frontend.id
}

output "public_ip" {
  description = "IP publica de React"
  value       = aws_instance.frontend.public_ip
}

output "private_ip" {
  description = "IP privada de React"
  value       = aws_instance.frontend.private_ip
}

output "frontend_url" {
  description = "URL publica del frontend"
  value       = "http://${aws_instance.frontend.public_ip}"
}

output "ssh_command" {
  description = "Comando de acceso SSH"
  value       = "ssh -i ~/.ssh/lab-2.pem ubuntu@${aws_instance.frontend.public_ip}"
}
