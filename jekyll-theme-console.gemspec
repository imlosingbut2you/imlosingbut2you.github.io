# frozen_string_literal: true

Gem::Specification.new do |spec|
  spec.name          = "jekyll-theme-console"
  spec.version       = "0.3.12"
  spec.authors       = ["Mert"]
  spec.email         = ["imlosingbut2you@gmail.com"]

  spec.summary       = "just a simple theme that looks like a console."
  spec.homepage      = "https://github.com/imlosingbut2you"
  spec.license       = "MIT"

  spec.files         = `git ls-files -z`.split("\x0").select { |f| f.match(%r!^(assets|_layouts|_includes|_sass|LICENSE|README)!i) }

  spec.add_runtime_dependency "jekyll", ">= 3.5"
  spec.add_runtime_dependency "jekyll-seo-tag"
  spec.add_development_dependency "bundler"
  spec.add_development_dependency "rake"
end
