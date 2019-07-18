/*! msketch.js v0.1 July 2019 */
/**
 * @author hanjong.kim@kaist.ac.kr, juwhan.k@gmial.com
 * Developed ID KAIST CIDR Lab. for EDISON Project, KISTI
 *
 * This library was built for calculating linkage-based mechanism,
 * based on Bächer et al. (2015)'s Symbolic Reconstruction algorithm
 * TOG paper: https://dl.acm.org/citation.cfm?id=2766985
 */

// =============================================================================
//                             MSKETCH CALC
// =============================================================================
'use strict';

var MSKETCH = {author: "CIDR.IDKAIST"};

( function () {
    // Point2D
    MSKETCH.Point2D = function(_x, _y){
        this.x = _x;
        this.y = _y;
    }
    MSKETCH.Point2D.prototype.getX = function(){
        return this.x;
    }
    MSKETCH.Point2D.prototype.getY = function(){
        return this.y;
    }
    MSKETCH.Point2D.prototype.set = function(_x, _y){
        this.x = _x;
        this.y = _y;
    }
    MSKETCH.Point2D.prototype.getDistance = function(_x, _y){
        var d = Math.sqrt((this.x-_x)*(this.x-_x) + (this.y-_y)*(this.y-_y));
        return d;
    }

    // Base Constraint
    MSKETCH.Constraint = function(){
        this.name;
        this.linkList = [];
        this.DOF = 0;
    }
    MSKETCH.Constraint.BASE = 0;
    MSKETCH.Constraint.TARGET = 1;

    MSKETCH.Constraint.prototype.getLinkList = function(){
        return this.linkList;
    }
    MSKETCH.Constraint.prototype.getLink = function(_i){
        if(_i < this.linkList.length) return this.linkList[_i];
        else return null;
    }
    MSKETCH.Constraint.prototype.setLink = function(_i, _l){
        if(_i < this.linkList.length) this.linkList[_i] = _l;
        else{
            while (this.linkList.length < _i) {
                this.linkList.push(null);
            }
            this.linkList.push(_l);
        }

    }
    MSKETCH.Constraint.prototype.getDOF = function(){
        return this.DOF;
    }

    // Coaxial Constraint
    MSKETCH.CoaxialConstraint = function(params){
        MSKETCH.Constraint.apply(this, arguments);
        if(params==null) params = {};

        this.pointList = [];
        this.DOF = -2;

        this.name = params.name || "CC" + MSKETCH.CoaxialConstraint.counter++;
        this.linkList.push(params.link1);
        this.linkList.push(params.link2);
        this.pointList.push(params.point1);
        this.pointList.push(params.point2);

    }
    MSKETCH.CoaxialConstraint.counter = 1;
    MSKETCH.CoaxialConstraint.prototype = Object.create( MSKETCH.Constraint.prototype );
    MSKETCH.CoaxialConstraint.constructor = MSKETCH.CoaxialConstraint;

    MSKETCH.CoaxialConstraint.prototype.toString = function(){
        return this.name;
    }
    MSKETCH.CoaxialConstraint.prototype.addPoint = function(_l, _p){
        this.linkList.push(_l);
        this.pointList.push(_p);
    }
    MSKETCH.CoaxialConstraint.prototype.removePoint = function(_p){
        var _i = this.pointList.indexOf(_p);
        if(_i != -1){
            this.linkList.splice(_i, 1);
            this.pointList.splice(_i, 1);
        }
    }
    MSKETCH.CoaxialConstraint.prototype.getPointList = function(){
        return this.pointList;
    }
    MSKETCH.CoaxialConstraint.prototype.getPoint = function(_i){
        if(_i < this.pointList.length) return this.pointList[_i];
        else return null;
    }

    // Angular Constraint
    MSKETCH.AngularConstraint = function(params){
        MSKETCH.Constraint.apply(this, arguments);

        this.angle;
        this.DOF = -1;

        this.name = params.name || "AC" + MSKETCH.AngularConstraint.counter++;
        this.linkList.push(params.link1);
        this.linkList.push(params.link2);
        this.angle = params.link2.getAngle() - params.link1.getAngle();
    }
    MSKETCH.AngularConstraint.counter = 1;
    MSKETCH.AngularConstraint.prototype = Object.create( MSKETCH.Constraint.prototype );
    MSKETCH.AngularConstraint.constructor = MSKETCH.AngularConstraint;

    MSKETCH.AngularConstraint.prototype.setAngle = function(_a){
        while (_a > 2 * Math.PI) {
            _a -= 2 * Math.PI;
        }
        while (_a < 0) {
            _a += 2 * Math.PI;
        }
        this.angle = _a;
    }
    MSKETCH.AngularConstraint.prototype.getAngle = function(){
        return this.angle;
    }

    // Slider Constraints (to be added)


    // Base Elements
    MSKETCH.Element = function(params){
        if(params == null) params = {};

        this.name = params.name || "Element" ;
        this.originPoint;
        this.originPointBackup;
        this.DOF;

        if(params.point instanceof MSKETCH.Point2D) this.originPoint = params.point;
        else this.originPoint = new MSKETCH.Point2D(params.x, params.y)
    }
    MSKETCH.Element.prototype.getOriginPoint = function(){
        return this.originPoint;
    }
    MSKETCH.Element.prototype.setOriginPoint = function(_x, _y){
        this.originPoint = new MSKETCH.Point2D(_x, _y);
    }
    MSKETCH.Element.prototype.getName = function(){
        return this.name;
    }
    MSKETCH.Element.prototype.setName = function(_name){
        this.name = _name;
    }
    MSKETCH.Element.prototype.getDOF = function(){
        return this.DOF;
    }
    MSKETCH.Element.prototype.savePosition = function(){
        this.originPointBackup = new MSKETCH.Point2D(this.originPoint.getX(), this.originPoint.getY());
    }
    MSKETCH.Element.prototype.restorePosition = function(){
        this.originPoint = this.originPointBackup;
    }

    // Link
    MSKETCH.Link = function(params){
        MSKETCH.Element.apply(this, arguments);
        if(params == null) params = {};

        this.pointList = [];
        this.angle = 0;
        this.DOF = 3;
        this.lengths = [];
        this.angleBackup = 0;

        this.name = params.name || "Link" + MSKETCH.Link.counter++;
        this.pointList.push(new MSKETCH.Point2D(0, 0));
    }
    MSKETCH.Link.counter = 1;
    // MSKETCH.Link.sliderCounter = 1;
    MSKETCH.Link.prototype = Object.create( MSKETCH.Element.prototype );
    MSKETCH.Link.constructor = MSKETCH.Link;

    MSKETCH.Link.prototype.toString = function(){
      return this.name;
    }
    MSKETCH.Link.prototype.getAngle = function(){
        return this.angle;
    }
    MSKETCH.Link.prototype.setAngle = function(_a){
        this.angle = _a;
    }
    MSKETCH.Link.prototype.getPointList = function(){
        return this.pointList;
    }
    MSKETCH.Link.prototype.getPoint = function(_i){
        return this.pointList[_i];
    }
    MSKETCH.Link.prototype.getGlobalPoint = function(_i){
        return this.getGlobalPosition(this.pointList[_i]);
    }
    MSKETCH.Link.prototype.addGlobalPoint = function(_x, _y){
        if(_x instanceof MSKETCH.Point2D){
            var _lp = this.getLocalPosition(_x);
            this.addLocalPoint(new MSKETCH.Point2D(_lp.getX(), _lp.getY()));
        }
        else this.addGlobalPoint(new MSKETCH.Point2D(_x, _y));
    }
    MSKETCH.Link.prototype.addLocalPoint = function(_x, _y){
        if(_x instanceof MSKETCH.Point2D) this.pointList.push(_x);
        else this.pointList.push(new MSKETCH.Point2D(_x, _y));
    }
    MSKETCH.Link.prototype.removePoint = function(_p){
        var _i = this.pointList.indexOf(_p);
        if(_i != -1) this.pointList.splice(_i, 1);
    }
    MSKETCH.Link.prototype.getGlobalPosition = function(_p){
        var _rv = new MSKETCH.Point2D(this.originPoint.getX()+_p.getX()*Math.cos(this.angle)-_p.getY()*Math.sin(this.angle),
                                    this.originPoint.getY()+_p.getX()*Math.sin(this.angle)+_p.getY()*Math.cos(this.angle));
        return _rv;
    }
    MSKETCH.Link.prototype.getLocalPosition = function(_p){
        var _tx = _p.getX()-this.originPoint.getX();
        var _ty = _p.getY()-this.originPoint.getY();

        var _rv = new MSKETCH.Point2D(_tx*Math.cos(-this.angle)-_ty*Math.sin(-this.angle), _tx*Math.sin(-this.angle)+_ty*Math.cos(-this.angle));

        return _rv;
    }
    MSKETCH.Link.prototype.getLength = function(){
        return this.lengths;
    }
    MSKETCH.Link.prototype.savePosition = function(){
        this.originPointBackup = new MSKETCH.Point2D(this.originPoint.getX(), this.originPoint.getY());
        this.angleBackup = this.angle;
    }
    MSKETCH.Link.prototype.restorePosition = function(){
        this.originPoint = this.originPointBackup;
        this.angle = this.angleBackup;
    }

    // Anchor
    MSKETCH.Anchor = function(){
        MSKETCH.Link.apply(this, arguments);

        this.name = "Anchor";
        this.originPoint = new MSKETCH.Point2D(0, 0);
        this.DOF = 0;
        this.pointList = [];
    }
    MSKETCH.Anchor.prototype = Object.create( MSKETCH.Link.prototype );
    MSKETCH.Anchor.constructor = MSKETCH.Anchor;

    // Motor
    MSKETCH.Motor = function(params){
        MSKETCH.Element.apply(this, arguments);
        if(params == null) params = {};

        // this.coaxialConstraint;
        // this.angularConstraint;
        this.angle = 0;
        this.initAngle = 0;

        this.isServo = false;
        this.servoStart = 0;
        this.servoEnd = Math.PI;
        this.speed = 1.00;
        this.shift = 0;
        this.direction = 0;

        this.name = params.name || "Motor" + MSKETCH.Motor.counter++;
        this.coaxialConstraint = params.cc;
        this.angularConstraint = new MSKETCH.AngularConstraint(params);
        this.originPoint = params.cc.getPoint(0);

    }
    MSKETCH.Motor.counter = 1;
    MSKETCH.Motor.prototype = Object.create( MSKETCH.Element.prototype );
    MSKETCH.Motor.constructor = MSKETCH.Motor;

    MSKETCH.Motor.prototype.getAngle = function(){
        return this.angle;
    }
    MSKETCH.Motor.prototype.setAngle = function(_a){
        this.angle = _a;
        this.angularConstraint.setAngle(this.angle - this.initAngle);
    }
    MSKETCH.Motor.prototype.setCoaxialConstraint = function(_cc){
        this.coaxialConstraint = _cc;
    }
    MSKETCH.Motor.prototype.getCoaxialConstraint = function(){
        return this.coaxialConstraint;
    }
    MSKETCH.Motor.prototype.getBaseLink = function(){
        return this.angularConstraint.getLink(MSKETCH.Constraint.BASE);
    }
    MSKETCH.Motor.prototype.getTargetLink = function(){
        return this.angularConstraint.getLink(MSKETCH.Constraint.TARGET);
    }
    MSKETCH.Motor.prototype.attach = function(_assembly){
        _assembly.addConstraint(this.angularConstraint);
    }
    MSKETCH.Motor.prototype.dettach = function(_assembly){
        _assembly.removeConstraint(this.angularConstraint);
    }
    MSKETCH.Motor.prototype.savePosition = function(){
        this.angleBackup = this.getAngle();
    }
    MSKETCH.Motor.prototype.restorePosition = function(){
        this.setAngle(this.angleBackup);
    }

    // Assembly
    MSKETCH.Assembly = function(){
        this.elements = [];
        this.constraints = [];
        this.motors = [];
        this.unspecified = [];
        this.anchor;
    }
    MSKETCH.Assembly.prototype.getAnchor = function(){
        return this.anchor;
    }
    MSKETCH.Assembly.prototype.addAnchor = function(_anchor){
        this.anchor = _anchor;
        this.addElement(_anchor);
    }
    MSKETCH.Assembly.prototype.getElements = function(){
        return this.elements;
    }
    MSKETCH.Assembly.prototype.addElement = function(_e){
        if(_e instanceof Array) this.elements.concat(_e);
        else this.elements.push(_e);
    }
    MSKETCH.Assembly.prototype.removeElement = function(_e){
        if(_e instanceof Array){
            for(var ei in _e){
                this.removeElement(_e[ei]);
            }
        }
        else{
            var _i = this.elements.indexOf(_e);
            if(_i != -1) this.elements.splice(_i, 1);
        }
    }
    MSKETCH.Assembly.prototype.getConstraints = function(){
        return this.constraints;
    }
    MSKETCH.Assembly.prototype.addConstraint = function(_c){
        if(_c instanceof Array) this.constraints.concat(_c);
        else this.constraints.push(_c);
    }
    MSKETCH.Assembly.prototype.removeConstraint = function(_c){
        var _i = this.constraints.indexOf(_c);
        if(_i != -1) this.constraints.splice(_i, 1);
    }
    // MSKETCH.Assembly.prototype.removePointInConstraint = function(_p){
    // }
    // MSKETCH.Assembly.prototype.appendCoaxialConstraint = function(params){
    // }
    // MSKETCH.Assembly.prototype.checkCoaxialConstraint = function(){
    // }
    MSKETCH.Assembly.prototype.getMotors = function(){
        return this.motors;
    }
    MSKETCH.Assembly.prototype.addMotor = function(_m){
        this.motors.push(_m);
        _m.attach(this);
    }
    MSKETCH.Assembly.prototype.removeMotor = function(_m){
        var _i = this.motors.indexOf(_m);
        if(_i != -1){
            this.motors.splice(_i, 1);
            _m.dettach(this);
        }
    }
    // MSKETCH.Assembly.prototype.removeActuatorInConstraint = function(){
    // }
    MSKETCH.Assembly.prototype.emptyUnspecified = function(){
        this.unspecified = [];
    }
    MSKETCH.Assembly.prototype.getUnspecified = function(){
        return this.unspecified;
    }
    MSKETCH.Assembly.prototype.addUnspecified = function(_e){
        if(_e instanceof Array) this.unspecified.concat(_e);
        else this.unspecified.push(_e);
    }
    MSKETCH.Assembly.prototype.getDOF = function(){
        var _dof = 0;
        for(var ei in this.elements){
    		_dof += this.elements[ei].getDOF();
        }
        for(var ci in this.constraints){
          	_dof += this.constraints[ci].getDOF();
        }
        return _dof;
    }
    MSKETCH.Assembly.prototype.savePositions = function(){
        for(var ei in this.elements){
            this.elements[ei].savePosition();
        }
        for(var mi in this.motors){
            this.motors[mi].savePosition();
        }
    }
    MSKETCH.Assembly.prototype.restorePositions = function(){
        for(var ei in this.elements){
            this.elements[ei].restorePosition();
        }
        for(var mi in this.motors){
            this.motors[mi].restorePosition();
        }
    }

    // Linkage Group
    MSKETCH.LinkGroup = function(_l){
        this.linkList = [];
        this.relativePosition = new MSKETCH.Point2D(0, 0);
        this.relativeAngle = 0;
        this.positionRelativeTo;
        this.angleRelativeTo;

        if(_l != null) this.linkList.push(_l);
    }
    MSKETCH.LinkGroup.prototype.setRelativePosition = function(_p){
        this.relativePosition = _p;
    }
    MSKETCH.LinkGroup.prototype.getRelativePosition = function(){
        return this.relativePosition;
    }
    MSKETCH.LinkGroup.prototype.setRelativeAngle = function(_a){
        this.relativeAngle = _a;
    }
    MSKETCH.LinkGroup.prototype.getRelativeAngle = function(){
        return this.relativeAngle;
    }
    MSKETCH.LinkGroup.prototype.getLinkList = function(){
        return this.linkList;
    }
    MSKETCH.LinkGroup.prototype.addLink = function(_l){
        if(_e instanceof Array) this.linkList.concat(_l);
        else this.linkList.push(_l);
    }
    MSKETCH.LinkGroup.prototype.removeLink = function(_l){
        var _i = this.linkList.indexOf(_l);
        if(_i != -1) this.linkList.splice(_i, 1);
    }
    MSKETCH.LinkGroup.prototype.findOutgoingCoaxialConstraint = function(_cl, _lg){
        var _rv = [];

        for(var ci in _cl){
            var _c = _cl[ci];
            if(_c instanceof MSKETCH.CoaxialConstraint){
                var _cc = _c;
                var _addedLG = [];

                for(var i in _cc.getPointList()){
                    if(this.linkList.indexOf(_cc.getLink(i)) != -1){
                        for(var j in _cc.getPointList()){
                            if((i != j) && (!(this.linkList.indexOf(_cc.getLink(j)) != -1)) && (_addedLG.indexOf(_cc.getLink(j)) == -1)){
                                _rv.push(new MSKETCH.CCI(_cc, i, j));
                                for(var lgi in _lg){
                                    if(_lg[lgi].getLinkList().indexOf(_cc.getLink(j)) != -1){
                                        _addedLG.push(_lg[lgi]);
                                    }
                                }
                            }
                        }
                        break;
                    }
                }
            }
        }
        return _rv;
    }
    MSKETCH.LinkGroup.prototype.findOutgoingSliderConstraint = function(_cl){
        var _rv = [];
        return _rv;
    }
    MSKETCH.LinkGroup.prototype.findOutgoingAngularConstraint = function(_cl){
        var _rv = [];

        for(var ci in _cl){
            var _c = _cl[ci];
            if(_c instanceof MSKETCH.AngularConstraint){
                for(var i=0; i<2; i++){
                    if((this.linkList.indexOf(_c.getLink(i)) != -1) && (this.linkList.indexOf(_c.getLink(1-i)) == -1)){
                        _rv.push(new MSKETCH.ACI(_c, 1-i));
                    }
                }
            }
        }
        return _rv;
    }
    MSKETCH.LinkGroup.prototype.getLocalPosition = function(_l, _p){
        var _x = _l.getOriginPoint().getX() + _p.getX()*Math.cos(_l.getAngle()) - _p.getY()*Math.sin(_l.getAngle());
        var _y = _l.getOriginPoint().getY() + _p.getX()*Math.sin(_l.getAngle()) + _p.getY()*Math.cos(_l.getAngle());
        return new MSKETCH.Point2D(_x, _y);
    }
    MSKETCH.LinkGroup.prototype.getLocalAngle = function(_l, _p){
        var _localPoistion = this.getLocalPosition(_l, _p);
        return Math.atan2(_localPoistion.getY(), _localPoistion.getX());
    }
    MSKETCH.LinkGroup.prototype.merge = function(_targetLG, _groupList){
        for(var li in _targetLG.getLinkList()){
            var _l = _targetLG.getLinkList()[li];

            var _ox = _l.getOriginPoint().getX();
            var _oy = _l.getOriginPoint().getY();

            var _rx = _ox * Math.cos(+ _targetLG.getRelativeAngle()) - _oy * Math.sin(+_targetLG.getRelativeAngle())+_targetLG.relativePosition.getX();
            var _ry = _ox * Math.sin(+ _targetLG.getRelativeAngle()) + _oy * Math.cos(+_targetLG.getRelativeAngle())+_targetLG.relativePosition.getY();

            _l.setOriginPoint(_rx, _ry);
            _l.setAngle( _l.getAngle() + _targetLG.getRelativeAngle() );
            this.linkList.push(_l);
        }

        var _i = _groupList.indexOf(_targetLG);
        if(_i != -1) _groupList.splice(_i, 1);
    }
    MSKETCH.LinkGroup.prototype.backToZero = function(){
        var _anchor = null;
        for(var li in this.linkList){
            var _l = this.linkList[li];
            if(_l instanceof MSKETCH.Anchor) _anchor = _l;
        }

        if(_anchor != null){
          var _zeroP = new MSKETCH.Point2D(  JSON.parse(JSON.stringify(_anchor.getOriginPoint().getX()) ),
                                            JSON.parse(JSON.stringify(_anchor.getOriginPoint().getY()) ) );
          var _zeroA = _anchor.getAngle();

          for(var li in this.linkList){
              var _l = this.linkList[li];
              var _ox = _l.getOriginPoint().getX() - _zeroP.getX();
              var _oy = _l.getOriginPoint().getY() - _zeroP.getY();

              var _rx = _ox * Math.cos(-_zeroA) - _oy * Math.sin(-_zeroA);
              var _ry = _ox * Math.sin(-_zeroA) + _oy * Math.cos(-_zeroA);

             _l.setOriginPoint(_rx, _ry);
             _l.setAngle( _l.getAngle() - _zeroA );
          }
        }
    }
    MSKETCH.LinkGroup.prototype.zeroToPoint = function(_origin){
        for(var i in this.linkList){
            var _l = this.linkList[i];
            var _x = _l.getOriginPoint().getX() - _origin.getX();
            var _y = _l.getOriginPoint().getY() - _origin.getY();
            _l.setOriginPoint(_x, _y);
        }
    }
    MSKETCH.LinkGroup.prototype.isBaseGroup = function(){
        for(var i in this.linkList){
    		if(this.linkList[i] instanceof MSKETCH.Anchor){
    		  return true;
    		}
    	}
    	return false;
    }

    MSKETCH.CCI = function(_c, _b, _t){
        this.constraint = _c;
        this.base = _b;
    	this.target = _t;
    }
    MSKETCH.CCI.prototype.inverseCCI = function(){
        return new MSKETCH.CCI(this.constraint, this.target, this.base);
    }

    MSKETCH.ACI = function(_c, _t){
        this.constraint = _c;
        this.target = _t;
        this.base = 1 - this.target;
    }

    MSKETCH.LinkTriangle = function(_b, _f, _o, _b2f, _b2o, _f2o){
        this.base = _b;
    	this.floating = _f;
    	this.output = _o;
      	this.b2f = _b2f;
      	this.b2o = _b2o;
      	this.f2o = _f2o;
    }
    MSKETCH.LinkTriangle2 = function(_a, _b, _c, _a2b, _b2c, _a2c){
        this.a = _a;
    	this.b = _b;
    	this.c = _c;
        this.a2b=_a2b;
    	this.b2c=_b2c;
    	this.a2c=_a2c;
    }

    // Mechnism Calculator
    MSKETCH.Calculator = function(){
        this.mapsOfMu;
        this.sliderMu;
    }
    MSKETCH.Calculator.prototype.onStart = function(_assembly){
        this.mapsOfMu = this.mapMu(_assembly);
        this.sliderMu = {};
    }
    MSKETCH.Calculator.prototype.calculateAssembly = function(_assembly){
    	var noError = true;
    	var maxCost = 0;

    	var groupList = this.buildLinkGroup(_assembly);
    	_assembly.emptyUnspecified();

    	var lastNOfGroup = groupList.length+1;

    	while(groupList.length > 1 && lastNOfGroup > groupList.length){
    		lastNOfGroup = groupList.length;

    		var baseGroupIndex = 0;
    		while(baseGroupIndex < groupList.length){
    			var baseLG = groupList[baseGroupIndex];
    			var outgoingCoaxialConstraint = baseLG.findOutgoingCoaxialConstraint( _assembly.getConstraints(), groupList);
            	var outgoingAngularConstraint = baseLG.findOutgoingAngularConstraint( _assembly.getConstraints() );

            	var targetIndex = baseGroupIndex + 1;
            	while(targetIndex < groupList.length){
            		var targetLG = groupList[targetIndex];

            		var ac_constraint = this.search_AC_Constraint(targetLG, outgoingAngularConstraint, outgoingCoaxialConstraint);

            		if(ac_constraint[0].length == 1 && ac_constraint[1].length == 1){
    		            var ac = ac_constraint[0][0];
    		            var cc = ac_constraint[1][0];

    		            targetLG.zeroToPoint(targetLG.getLocalPosition(cc.constraint.getLink(cc.target), cc.constraint.getPoint(cc.target)));
    		            targetLG.setRelativePosition(baseLG.getLocalPosition(cc.constraint.getLink(cc.base),   cc.constraint.getPoint(cc.base)));
    		            var angleSign = (ac.target == MSKETCH.Constraint.TARGET) ?+1 : -1;

    		            targetLG.setRelativeAngle( ac.constraint.getLink(ac.base).getAngle() - ac.constraint.getLink(ac.target).getAngle() + angleSign * ac.constraint.getAngle());

    		            baseLG.merge(targetLG, groupList);

    		            outgoingCoaxialConstraint = baseLG.findOutgoingCoaxialConstraint( _assembly.getConstraints(), groupList );
    		            outgoingAngularConstraint = baseLG.findOutgoingAngularConstraint( _assembly.getConstraints() );
    	            }else{
    		            if(ac_constraint[0].length + ac_constraint[1].length >= 2){
                            // Over-constraint
                        }
    		            targetIndex++;
    		        }
            	}

            	var needToFindMore = true;

    	        while(needToFindMore){
    	          needToFindMore = false;

                  /// XXX constraint ///
    	          var triangle = this.findXXXLinkTriangle(_assembly, groupList, baseLG, outgoingCoaxialConstraint);
    	          if( triangle != null ){
    	            var 	b    = triangle.base;
    	            var 	f    = triangle.floating;
    	            var 	o    = triangle.output;
    	            var     b2f  = triangle.b2f;
    	            var     b2o  = triangle.b2o;
    	            var     f2o  = triangle.f2o;

    	            var R1   = this.getPtoP( b.getLocalPosition(b2f.constraint.getLink(b2f.base), 	b2f.constraint.getPoint(b2f.base)  ), b.getLocalPosition(b2o.constraint.getLink(b2o.base  ), b2o.constraint.getPoint(b2o.base  )) );
    	            var R2   = this.getPtoP( f.getLocalPosition(b2f.constraint.getLink(b2f.target), b2f.constraint.getPoint(b2f.target)), f.getLocalPosition(f2o.constraint.getLink(f2o.base  ), f2o.constraint.getPoint(f2o.base  )) );
    	            var R3   = this.getPtoP( o.getLocalPosition(b2o.constraint.getLink(b2o.target), b2o.constraint.getPoint(b2o.target)), o.getLocalPosition(f2o.constraint.getLink(f2o.target), f2o.constraint.getPoint(f2o.target)) );

    	            var dr1 = R1.getDistance(0,0);
    	            var dr2 = R2.getDistance(0,0);
    	            var dr3 = R3.getDistance(0,0);

    				var angle1 = 0;
    				var angle2 = 0;

    	            if( dr1==0 || dr1>dr2+dr3 || dr2>dr1+dr3 || dr3>dr1+dr2){
    	              noError = false;
    	              maxCost = Number.POSITIVE_INFINITY;

    				  if ( dr1>dr2+dr3 ) {
    	                angle1=0;
    	                angle2=0;
    	              } else if ( dr2>dr1+dr3 ) {
    	                angle1=0;
    	                angle2=Math.PI;
    	              } else if ( dr3>dr1+dr2 ) {
    	                angle1=Math.PI;
    	                angle2=0;
    	              }

    	            } else {
    				  angle1  = Math.acos((dr1*dr1+dr2*dr2-dr3*dr3)/(2*dr1*dr2));
      	              angle2  = Math.acos((dr1*dr1+dr3*dr3-dr2*dr2)/(2*dr1*dr3));

    				  var cost = this.getTriangleCost(dr1, dr2, dr3);
    				  if(maxCost < cost) maxCost = cost;
    			    }

    	              var mu = ((this.mapsOfMu[(b2f.constraint)])[(b2o.constraint)])[(f2o.constraint)];
    				  angle1  = Math.atan2(R1.getY(), R1.getX()) - Math.atan2(R2.getY(), R2.getX()) - mu * angle1;
    	              angle2  = Math.atan2(-R1.getY(), -R1.getX()) - Math.atan2(R3.getY(), R3.getX()) + mu * angle2;

    	              f.zeroToPoint( f.getLocalPosition(b2f.constraint.getLink(b2f.target), b2f.constraint.getPoint(b2f.target)) );
    	              f.setRelativePosition( b.getLocalPosition(b2f.constraint.getLink(b2f.base), b2f.constraint.getPoint(b2f.base)) );
    	              f.setRelativeAngle( angle1 );
    	              o.zeroToPoint( o.getLocalPosition(b2o.constraint.getLink(b2o.target), b2o.constraint.getPoint(b2o.target)) );
    	              o.setRelativePosition( b.getLocalPosition(b2o.constraint.getLink(b2o.base), b2o.constraint.getPoint(b2o.base)) );

    	              o.setRelativeAngle( angle2 );

    	              b.merge(f, groupList);
    	              b.merge(o, groupList);

    	              outgoingCoaxialConstraint = baseLG.findOutgoingCoaxialConstraint( _assembly.getConstraints(), groupList );
    	              outgoingAngularConstraint = baseLG.findOutgoingAngularConstraint( _assembly.getConstraints() );

    	              needToFindMore = true;
    	            }


    				/// XSX constraint ///
    				var triangle2 = this.findXSXLinkTriangle(_assembly, groupList, baseLG, outgoingCoaxialConstraint);

    				if ( triangle2 != null ) {
    				  var       a   = triangle2.a;
    				  var       b   = triangle2.b;
    				  var       c   = triangle2.c;
    				  var       a2b = triangle2.a2b;
    				  var  		b2c = triangle2.b2c;
    				  var       a2c = triangle2.a2c;


    				  var VP   = this.getPtoP( a.getLocalPosition(a2b.constraint.getLink(a2b.base), a2b.constraint.getPoint(a2b.base)), a.getLocalPosition(a2c.constraint.getLink(a2c.base), a2c.constraint.getPoint(a2c.base) ) );
    				  var L2   = VP.getX() * VP.getX() + VP.getY() * VP.getY();

    				  var VA   = this.getPtoP( b.getLocalPosition(a2b.constraint.getLink(a2b.target), a2b.constraint.getPoint(a2b.target)), b.getLocalPosition(b2c.getLink(MSKETCH.Constraint.BASE), b2c.getPoint1() ) );
    				  var VB   = this.getPtoP( b.getLocalPosition(b2c.getLink(MSKETCH.Constraint.BASE), b2c.getPoint1() ), b.getLocalPosition(b2c.getLink(MSKETCH.Constraint.BASE), b2c.getPoint2() ) );
    				  var DA   = this.getPtoP( c.getLocalPosition(b2c.getLink(MSKETCH.Constraint.TARGET), new MSKETCH.Point2D(0, 0) ), c.getLocalPosition(a2c.constraint.getLink(a2c.target), a2c.constraint.getPoint(a2c.target)) );

    				  VA = new MSKETCH.Point2D(VA.getX()+DA.getX(), VA.getY()+DA.getY());

    				  var det = Math.pow(VA.getX()*VB.getX()+VA.getY()*VB.getY() ,2) - (VB.getX()*VB.getX() + VB.getY()*VB.getY()) * (VA.getX()*VA.getX() + VA.getY()*VA.getY() - L2);

    				  if( det >= 0 ) {
    					var mu;
    					if(this.sliderMu[b2c]==null){

    					  var positive_t = ( -(VA.getX()*VB.getX()+VA.getY()*VB.getY()) + Math.sqrt(det) ) / (VB.getX()*VB.getX() + VB.getY()*VB.getY());
    					  var negative_t = ( -(VA.getX()*VB.getX()+VA.getY()*VB.getY()) - Math.sqrt(det) ) / (VB.getX()*VB.getX() + VB.getY()*VB.getY());
    					  var positive_des = new MSKETCH.Point2D( VA.getX() + VB.getX()*positive_t, VA.getY() + VB.getY()*positive_t );
    					  var negative_des = new MSKETCH.Point2D( VA.getX() + VB.getX()*negative_t, VA.getY() + VB.getY()*negative_t );

    					  var vP = this.getPtoP( a2b.constraint.getLink(a2b.base).getGlobalPosition(a2b.constraint.getPoint(a2b.base)), a2c.constraint.getLink(a2c.base).getGlobalPosition(a2c.constraint.getPoint(a2c.base)) );

    					  var positiveDist = MSKETCH.dist(vP, positive_des);
    					  var negativeDist = MSKETCH.dist(vP, negative_des);

    					  if(positiveDist < negativeDist) {
    						mu = +1.;
    					  } else {
    						mu = -1.;
    					  }
    					  this.sliderMu[b2c] = mu;

    					} else {
    					  mu = this.sliderMu[b2c];
    					}
    					var  t = ( -(VA.getX()*VB.getX()+VA.getY()*VB.getY()) + mu * Math.sqrt(det) ) / (VB.getX()*VB.getX() + VB.getY()*VB.getY());

    					if(t < 0 || t > 1){
    					  //console.log("BROKEN: slider out of range")
    					  _assembly.addUnspecified(a2c.constraint.getLink(a2c.base));
    					  _assembly.addUnspecified(a2c.constraint.getLink(a2c.target));

    					  if(t<0) t=0;
    					  if(t>1) t=1;
    					}

    					var des = new MSKETCH.Point2D( VA.getX() + VB.getX()*t, VA.getY() + VB.getY()*t );
    					var angle = Math.atan2(VP.getY(), VP.getX()) - Math.atan2(des.getY(), des.getX());

    					b.zeroToPoint( b.getLocalPosition(a2b.constraint.getLink(a2b.target), a2b.constraint.getPoint(a2b.target)) );
    					b.setRelativePosition( a.getLocalPosition(a2b.constraint.getLink(a2b.base), a2b.constraint.getPoint(a2b.base)) );
    					b.setRelativeAngle(angle);

    					des = new Point2D(des.getX()-DA.getX(), des.getY()-DA.getY());
    					c.zeroToPoint( c.getLocalPosition(b2c.getLink(b2c.TARGET), new MSKETCH.Point2D(0, 0)  )  );
    					c.setRelativePosition( des );

    					c.setRelativeAngle(b2c.getLink(MSKETCH.Constraint.BASE).getAngle()-b2c.getLink(MSKETCH.Constraint.TARGET).getAngle()+b2c.getAngle());

    					b.merge(c, groupList);
    					a.merge(b, groupList);

    				  } else {
    					// broken
    				  }
    				}
    	          }
    	        baseGroupIndex++;
    		}
    	}
    	// position specification -- fininshed //

    	for(var i=1; i<groupList.length; i++){
    		_assembly.addUnspecified(groupList[i].getLinkList());
        }

        // additional specification //
        var needToMove = true;
        while(needToMove){
          needToMove = false;
          var space=groupList[0];

          for(var i=1; i<groupList.length; i++){
            var baseLG = groupList[i];
            var outgoingCoaxialConstraint = baseLG.findOutgoingCoaxialConstraint( _assembly.getConstraints(), groupList );
            for(var ccii in outgoingCoaxialConstraint){
            	var cci = outgoingCoaxialConstraint[ccii];
              if( space.getLinkList().indexOf(cci.constraint.getLink(cci.target)) != -1 ){
                baseLG.zeroToPoint( baseLG.getLocalPosition(cci.constraint.getLink(cci.base), cci.constraint.getPoint(cci.base)));
                baseLG.setRelativePosition( space.getLocalPosition(cci.constraint.getLink(cci.target), cci.constraint.getPoint(cci.target)));
                space.merge(baseLG, groupList);
                needToMove = true;
                break;
              }
            }
          }
        }

    	// Rearranging all mechanism //
        groupList[0].backToZero();

        return maxCost;
    }

    MSKETCH.Calculator.prototype.getTriangleCost = function(dr1, dr2, dr3){
        var ds = [dr1, dr2, dr3];
        ds.sort();
        if( ds[2] >= ds[0] + ds[1] ){
            return Number.POSITIVE_INFINITY;
        } else {
            return 3*(ds[0]+ds[1])/(ds[0]+ds[1]-ds[2]);
        }
    }

    MSKETCH.Calculator.prototype.buildLinkGroup = function(_assembly){
    	var _rv = [];

        for(var ei in _assembly.getElements()){
            var e = _assembly.getElements()[ei];
            if(e instanceof MSKETCH.Link){
                var lg = new MSKETCH.LinkGroup(e);
                if(e instanceof MSKETCH.Anchor){
                    _rv.splice(0, 0, lg);
                } else {
                    _rv.push(lg);
                }
            }
        }

        return _rv;
    }

    MSKETCH.Calculator.prototype.mapMu = function(_assembly){
    	var _rv = {};

        for(var c1i in _assembly.getConstraints()){
        	var c1 = _assembly.getConstraints()[c1i];
        	var secondLayer = {};

          	if(c1 instanceof MSKETCH.CoaxialConstraint){
          		var p1 = c1.getLink(MSKETCH.Constraint.BASE).getGlobalPosition(c1.getPoint(MSKETCH.Constraint.BASE));

    	        for(var c2i in _assembly.getConstraints()){
    	        	var c2 = _assembly.getConstraints()[c2i];

    	          	if(c2 instanceof MSKETCH.CoaxialConstraint && c1!=c2){
    	            	var thirdLayer = {};

    	            	var p2 = c2.getLink(MSKETCH.Constraint.BASE).getGlobalPosition(c2.getPoint(MSKETCH.Constraint.BASE));

    	            	p2.set(p2.getX()-p1.getX(), p2.getY()-p1.getY());

    	            	for(var c3i in _assembly.getConstraints()){
    	            		var c3 = _assembly.getConstraints()[c3i];

    	              		if(c3 instanceof MSKETCH.CoaxialConstraint && c1!=c3 && c2!=c3){
    							var p3 = c3.getLink(MSKETCH.Constraint.BASE).getGlobalPosition(c3.getPoint(MSKETCH.Constraint.BASE));

    	                		p3.set(p3.getX()-p1.getX(), p3.getY()-p1.getY());
    	                		var v = p2.getY()*p3.getX() - p2.getX()*p3.getY();

    	                		if(v>0) v=1;
    	                		if(v<0) v=-1;
    	                		thirdLayer[c3] = v;

    	              		}
    	            	}
    	            	secondLayer[c2] = thirdLayer;
    	          	}
    	        }
    	        _rv[c1] = secondLayer;
    	      }
        }

        return _rv;
    }

    MSKETCH.Calculator.prototype.search_AC_Constraint = function(_targetLG, _angularConstraint, _coaxialConstraint){
    	var _rv = [];

        _rv[0] = [];
        for(var acii in _angularConstraint){
        	var aci = _angularConstraint[acii];
        	if(aci instanceof MSKETCH.ACI){
    			if(_targetLG.getLinkList().indexOf(aci.constraint.getLink(aci.target)) != -1){
    				_rv[0].push(aci);
    			}
    		}
        }

        _rv[1] = [];
        for(var ccii in _coaxialConstraint){
        	var cci = _coaxialConstraint[ccii];
        	if(cci instanceof MSKETCH.CCI){
    	    	if(_targetLG.getLinkList().indexOf(cci.constraint.getLink(cci.target)) != -1){
    	    		_rv[1].push(cci);
    	    	}
    	    }
        }
        return _rv;
    }

    MSKETCH.Calculator.prototype.findXXXLinkTriangle = function(_assembly, _groupList, _baseGroup, _outgoingCoaxialConstraint){
        var connectedLGList = [];
        var duplicateLGList = [];

        for(var ccii in _outgoingCoaxialConstraint){
        	var cci = _outgoingCoaxialConstraint[ccii];
        	if(cci instanceof MSKETCH.CCI){
    	      	var lg = this.findGroupByLink(_groupList, cci.constraint.getLink(cci.target));

    			if(duplicateLGList.indexOf(lg) == -1){
    				if(connectedLGList.indexOf(lg) == -1){
    					connectedLGList.push(lg);
    				}else{
    			  		duplicateLGList.push(lg);
                        var _i = connectedLGList.indexOf(lg);
                        if(_i != -1) connectedLGList.splice(_i, 1);
    				}
    			}
    		}
        }
        if(connectedLGList.length <= 1) return null;

        for(var targetIndex1=0; targetIndex1<connectedLGList.length-1; targetIndex1++){
          	var floating = connectedLGList[targetIndex1];
          	var floatingToOutCoaxialConstraint = floating.findOutgoingCoaxialConstraint(_assembly.getConstraints(), _groupList);

          	for(var targetIndex2=targetIndex1+1; targetIndex2<connectedLGList.length; targetIndex2++){
            	var output = connectedLGList[targetIndex2];

            	var f2o = null;
            	var b2f = null;
            	var b2o = null;
            	var count = 0;

            	for(var tci in floatingToOutCoaxialConstraint){
            		var tc = floatingToOutCoaxialConstraint[tci];
    	        	if(output.getLinkList().indexOf(tc.constraint.getLink(tc.target)) != -1){
    	            	f2o = tc;
    	            	count++;
    	        	}
    	        }

            	if(count==1){
    				for(var tci in _outgoingCoaxialConstraint){
    					var tc = _outgoingCoaxialConstraint[tci];
    					if(floating.getLinkList().indexOf(tc.constraint.getLink(tc.target)) != -1){
    						b2f = tc;
    					}
    				else if(output.getLinkList().indexOf(tc.constraint.getLink(tc.target)) != -1){
    				  		b2o = tc;
    					}
    				}

    				if(b2f.constraint!=b2o.constraint && b2f.constraint!=f2o.constraint && b2o.constraint!=f2o.constraint) {
    		            if(floating.isBaseGroup()){
                            var temp = _baseGroup;
                            _baseGroup = floating;
                            floating = temp;
                            b2f = b2f.inverseCCI();

                            var temp2 = b2o;
                            b2o = f2o;
                            f2o = temp2;
    		            }else if(output.isBaseGroup()){
                            var temp = _baseGroup;
                            _baseGroup = output;
                            output = temp;
                            b2o = b2o.inverseCCI();

    		              	var temp2 = f2o;
                  			f2o = b2f.inverseCCI();
                  			b2f = temp2.inverseCCI();
    		            }
    		            return new MSKETCH.LinkTriangle(_baseGroup, floating, output, b2f, b2o, f2o);
    		        }
            	}
          	}
        }

        return null;
    }

    MSKETCH.Calculator.prototype.findXSXLinkTriangle = function(_assembly, _groupList, _baseGroup, _outgoingCoaxialConstraint){
        var connectedLGList = [];
        var duplicateLGList = [];

        for(var ccii in _outgoingCoaxialConstraint){
        	var cci = _outgoingCoaxialConstraint[ccii];
        	if(cci instanceof MSKETCH.CCI){
    	      	var lg = this.findGroupByLink(_groupList, cci.constraint.getLink(cci.target));

    			if(duplicateLGList.indexOf(lg)!=-1){
    				if(connectedLGList.indexOf(lg)!=-1){
    					connectedLGList.push(lg);
    				}else{
    			  		duplicateLGList.push(lg);
                        var _i = connectedLGList.indexOf(lg);
                        if(_i != -1) connectedLGList.splice(_i, 1);
    				}
    			}
    		}
        }
        if(connectedLGList.length <=1 ) return null;

        for(var targetIndex1 = 0; targetIndex1 < connectedLGList.length; targetIndex1++){
          	var floating = connectedLGList[targetIndex1];

          	var floatingToOutgoingSliderConstraint = floating.findOutgoingSliderConstraint(_assembly.getConstraints());

    		if(floatingToOutgoingSliderConstraint.length > 0){
          		for(var targetIndex2 = 0; targetIndex2 < connectedLGList.length; targetIndex2++){

    				if(targetIndex1 != targetIndex2){
    					var output = connectedLGList[targetIndex2];

    					b2c = null;
    					a2b = null;
    					a2c = null;

    					var count = 0;

    					for (var sci in floatingToOutgoingSliderConstraint) {
    						var sc = floatingToOutgoingSliderConstraint[sci];

    		              if (output.getLinkList().indexOf(sc.getLink(MSKETCH.Constraint.TARGET)) != -1) {
    		                b2c = sc;
    		                count++;
    		              }
    		            }

    					if(count == 1){
    						for (var tci in _outgoingCoaxialConstraint) {
    							var tc = _outgoingCoaxialConstraint[tci];
    						  if (floating.getLinkList().indexOf(tc.constraint.getLink(tc.target)) != -1) {
    							a2b = tc;
                            } else if (output.getLinkList().indexOf(tc.constraint.getLink(tc.target)) != -1) {
    							a2c = tc;
    						  }
    						}

    						if (a2c!=null && a2b!=null & a2b.constraint!=a2c.constraint) {
    						  return new MSKETCH.LinkTriangle2(_baseGroup, floating, output, a2b, b2c, a2c);
    						}
    					}
    				}
    			}
    		}
    	}

    	return null;
    }

    MSKETCH.Calculator.prototype.findGroupByLink = function(_groupList, _link){
    	for(var li in _groupList){
    		var lg = _groupList[li];
    		if(lg.linkList.indexOf(_link) != -1){
    			return lg;
    		}
    	}
       return null;
    }

    MSKETCH.Calculator.prototype.getPtoP = function(_p1, _p2){
    	return new MSKETCH.Point2D(_p2.getX()-_p1.getX(), _p2.getY()-_p1.getY());
    }

    MSKETCH.dist = function(_v, _w) {
        return Math.sqrt( (_v.getX()-_w.getX())*(_v.getX()-_w.getX()) + (_v.getY()-_w.getY())*(_v.getY()-_w.getY()) );
    }
}() );
